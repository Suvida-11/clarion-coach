"""Orchestrator: coordinates the AI agent pipeline and records an execution trace.

Orchestration is deliberately code-based Python (no LangGraph / CrewAI / AutoGen).

Simulator mode:  Customer Simulator -> Intent -> Knowledge -> Coaching -> Escalation
Manual mode:     Intent -> Knowledge -> Coaching -> Escalation
Replay mode:     For each transcript message: Intent -> Knowledge -> Coaching -> Escalation
"""
from __future__ import annotations
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

from ..agents.coaching_agent import coach
from ..agents.customer_simulator_agent import simulate_customer
from ..agents.escalation_monitor_agent import monitor
from ..agents.intent_agent import analyze_intent
from ..agents.knowledge_recommendation_agent import recommend
from ..schemas.chat import (
    AgentTraceEntry,
    ChatMessage,
    ChatRequest,
    ChatTurnResponse,
    CoachingSuggestion,
    EscalationRisk,
    IntentAnalysis,
    ReplayTurn,
    RetrievedChunk,
)
from . import store


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_msg(role: str, content: str) -> ChatMessage:
    return ChatMessage(
        id=f"msg_{uuid.uuid4().hex[:10]}",
        role=role,  # type: ignore[arg-type]
        content=content,
        timestamp=_now(),
    )


def _run_agent(
    name: str,
    fn: Callable[[], Any],
    summarize: Callable[[Any], tuple[str, dict]],
    trace: list[AgentTraceEntry],
) -> Any:
    """Execute one agent, recording start/end time, duration, status and summary."""
    started_at = _now()
    t0 = time.perf_counter()
    try:
        result = fn()
        summary, details = summarize(result)
        status = "Completed"
    except Exception as e:  # pragma: no cover - defensive
        result = None
        summary, details = f"{name} failed: {e}", {"error": str(e)}
        status = "Failed"
    ms = int((time.perf_counter() - t0) * 1000)
    ended_at = _now()
    trace.append(
        AgentTraceEntry(
            agent=name,
            status=status,  # type: ignore[arg-type]
            execution_time=f"{ms} ms",
            execution_ms=ms,
            summary=summary,
            timestamp=ended_at,
            started_at=started_at,
            ended_at=ended_at,
            details=details,
        )
    )
    return result


def _session_context(session_id: str | None) -> dict[str, Any]:
    """Prior-turn context used by coaching + escalation agents."""
    prev_turns = store.session_turns(session_id) if session_id else []
    prev_suggestions = [t.coaching.suggested_response for t in prev_turns[-6:]]
    prev_tips: list[str] = []
    for t in prev_turns[-4:]:
        prev_tips.extend(t.coaching.empathy_notes)
        prev_tips.extend(t.coaching.professional_notes)
        prev_tips.extend(t.coaching.tone_notes)
        prev_tips.extend(t.coaching.improvement_tips)
    history = [
        {"role": m.role, "content": m.content}
        for t in prev_turns[-8:]
        for m in ([t.turn] + ([t.simulated_customer_reply] if t.simulated_customer_reply else []))
    ]
    return {
        "turns": prev_turns,
        "previous_suggestions": prev_suggestions,
        "previous_tips": prev_tips,
        "history": history,
        "frustration_series": [t.analysis.frustration for t in prev_turns],
        "intents": [t.analysis.intent for t in prev_turns],
        "turn_number": len(prev_turns) + 1,
    }


def _pipeline(
    customer_message: str,
    trace: list[AgentTraceEntry],
    session_id: str | None = None,
    ctx: dict[str, Any] | None = None,
) -> tuple[IntentAnalysis, list[RetrievedChunk], list[dict], EscalationRisk, CoachingSuggestion]:
    """Intent -> Knowledge -> Coaching -> Escalation, with full trace recording."""
    ctx = ctx if ctx is not None else _session_context(session_id)

    analysis: IntentAnalysis = _run_agent(
        "Intent Detection Agent",
        lambda: analyze_intent(customer_message),
        lambda a: (
            f"Detected {a.intent}",
            {
                "input": customer_message,
                "intent": a.intent,
                "sentiment": a.sentiment,
                "sentiment_score": a.sentiment_score,
                "frustration": a.frustration,
                "urgency": a.urgency,
                "confidence": a.confidence,
            },
        ),
        trace,
    ) or IntentAnalysis(intent="General Inquiry", sentiment="neutral")

    kb = _run_agent(
        "Knowledge Recommendation Agent",
        lambda: recommend(customer_message, k=3),
        lambda r: (
            f"Retrieved {len(r[0])} relevant documents",
            {
                "query": customer_message,
                "retrieved": [
                    {"title": c.title, "similarity": c.similarity, "source": c.source}
                    for c in r[0]
                ],
                "top_match": r[0][0].title if r[0] else None,
                "top_similarity": r[0][0].similarity if r[0] else None,
            },
        ),
        trace,
    )
    knowledge: list[RetrievedChunk] = kb[0] if kb else []
    kb_docs: list[dict] = kb[1]["documents"] if kb else []

    coaching: CoachingSuggestion = _run_agent(
        "Coaching Agent",
        lambda: coach(
            customer_message,
            analysis,
            history=ctx["history"],
            previous_suggestions=ctx["previous_suggestions"],
            previous_tips=ctx["previous_tips"],
            knowledge_titles=[c.title for c in knowledge],
            knowledge_previews=[getattr(c, "content", "") or "" for c in knowledge],
            agent_message=str(ctx.get("last_agent_message") or ""),

        ),
        lambda c: (
            f"Coaching score {c.coaching_score}/100",
            {
                "suggested_response": c.suggested_response,
                "tone_notes": c.tone_notes,
                "clarity_notes": c.clarity_notes,
                "grammar_notes": c.grammar_notes,
                "empathy_notes": c.empathy_notes,
                "professional_notes": c.professional_notes,
                "improvement_tips": c.improvement_tips,
                "scores": c.scores.model_dump(),
                "coaching_score": c.coaching_score,
                "score_reasoning": c.score_reasoning,
            },
        ),
        trace,
    )
    if coaching is None:  # pragma: no cover
        from ..agents.coaching_agent import _fallback as _coach_fb

        coaching = _coach_fb(customer_message, analysis)

    risk: EscalationRisk = _run_agent(
        "Escalation Risk Monitor Agent",
        lambda: monitor(
            customer_message,
            analysis,
            history=ctx["history"],
            frustration_series=ctx["frustration_series"],
            intents=ctx["intents"],
            turn_number=ctx["turn_number"],
        ),
        lambda r: (
            f"Escalation risk {r.level} ({int(r.probability * 100)}%)",
            {
                "probability": r.probability,
                "level": r.level,
                "reasoning": r.reasoning,
                "recommended_action": r.recommended_action,
                "repeated_complaints": r.repeated_complaints,
                "resolution_status": r.resolution_status,
                "signals": r.signals,
            },
        ),
        trace,
    )
    if risk is None:  # pragma: no cover
        risk = EscalationRisk(
            probability=0.0,
            level="low",
            reasoning="Monitor unavailable",
            recommended_action="Continue standard flow",
        )

    return analysis, knowledge, kb_docs, risk, coaching


def handle_chat(
    req: ChatRequest,
    persona: str | None = None,
    scenario: str | None = None,
) -> ChatTurnResponse:
    turn = _new_msg(req.role, req.message)
    sess = store.get_session(req.session_id)
    mode = sess.config.mode if sess else "manual"
    trace: list[AgentTraceEntry] = []
    ctx = _session_context(req.session_id)

    # Manual mode, replay stepping, or customer speaking in simulator:
    # analyze the incoming customer message through the full pipeline.
    if req.role == "customer" or mode in ("manual", "replay"):
        analysis, knowledge, kb_docs, risk, coaching = _pipeline(
            req.message, trace, req.session_id, ctx
        )
        return ChatTurnResponse(
            turn=turn,
            analysis=analysis,
            coaching=coaching,
            knowledge=knowledge,
            risk=risk,
            customer_message=req.message,
            intent_analysis=analysis,
            knowledge_recommendations=kb_docs,
            risk_level=risk.level,
            agent_trace=trace,
        )

    # Simulator mode + agent turn: generate the customer's reply first.
    history = ctx["history"] or [
        {"role": m.role, "content": m.content}
        for m in (sess.messages if sess and hasattr(sess, "messages") else [])
    ]
    sim = _run_agent(
        "Customer Simulator Agent",
        lambda: simulate_customer(persona, scenario, req.message, history=history),
        lambda s: (
            "Generated realistic customer reply",
            {
                "input": req.message,
                "generated_reply": s.get("customer_message"),
                "emotion": s.get("emotion"),
                "frustration_level": s.get("frustration_level"),
                "conversation_stage": s.get("conversation_stage"),
            },
        ),
        trace,
    ) or {}
    simulated_content = sim.get("customer_message") or ""
    simulated = _new_msg("customer", simulated_content)

    analysis, knowledge, kb_docs, risk, coaching = _pipeline(
        simulated_content, trace, req.session_id, ctx
    )
    return ChatTurnResponse(
        turn=turn,
        simulated_customer_reply=simulated,
        analysis=analysis,
        coaching=coaching,
        knowledge=knowledge,
        risk=risk,
        customer_message=simulated_content,
        intent_analysis=analysis,
        knowledge_recommendations=kb_docs,
        risk_level=risk.level,
        conversation_summary=sim.get("conversation_stage"),
        agent_trace=trace,
    )


# ---------------------------------------------------------------------------
# Replay mode
# ---------------------------------------------------------------------------
def analyze_replay_message(
    session_id: str,
    index: int,
    role: str,
    message: str,
) -> ReplayTurn:
    """Run the full analysis pipeline for a single replayed transcript message.

    Agent (support rep) lines are recorded without analysis — only customer
    messages drive Intent -> Knowledge -> Coaching -> Escalation.
    """
    trace: list[AgentTraceEntry] = []
    if role != "customer":
        trace.append(
            AgentTraceEntry(
                agent="Replay",
                status="Skipped",
                execution_time="0 ms",
                execution_ms=0,
                summary="Support agent line — no customer analysis required",
                timestamp=_now(),
                started_at=_now(),
                ended_at=_now(),
                details={"message": message},
            )
        )
        return ReplayTurn(index=index, role=role, message=message, agent_trace=trace)  # type: ignore[arg-type]

    ctx = _session_context(session_id)
    analysis, knowledge, kb_docs, risk, coaching = _pipeline(message, trace, session_id, ctx)
    result = ChatTurnResponse(
        turn=_new_msg("customer", message),
        analysis=analysis,
        coaching=coaching,
        knowledge=knowledge,
        risk=risk,
        customer_message=message,
        intent_analysis=analysis,
        knowledge_recommendations=kb_docs,
        risk_level=risk.level,
        agent_trace=trace,
    )
    store.record_turn(session_id, result)
    return ReplayTurn(
        index=index,
        role="customer",
        message=message,
        analysis=analysis,
        coaching=coaching,
        knowledge=knowledge,
        risk=risk,
        agent_trace=trace,
    )
