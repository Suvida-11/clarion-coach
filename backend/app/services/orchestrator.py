"""Orchestrator: coordinates the AI agent pipeline and records an execution trace.

Simulator mode:  Customer Simulator -> Intent -> Knowledge -> Coaching -> Risk
Manual mode:     Intent -> Knowledge -> Coaching -> Risk
Replay mode:     Replays stored turns (no Gemini calls)
"""
from __future__ import annotations
import time
import uuid
from datetime import datetime, timezone

from ..agents.coaching_agent import coach
from ..agents.customer_simulator_agent import simulate_customer
from ..agents.intent_agent import analyze_intent
from ..agents.knowledge_recommendation_agent import recommend
from ..schemas.chat import (
    AgentTraceEntry,
    ChatMessage,
    ChatRequest,
    ChatTurnResponse,
    EscalationRisk,
    IntentAnalysis,
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


def _trace(agent: str, started: float, summary: str, details: dict, status: str = "Completed") -> AgentTraceEntry:
    ms = int((time.perf_counter() - started) * 1000)
    return AgentTraceEntry(
        agent=agent,
        status=status,  # type: ignore[arg-type]
        execution_time=f"{ms} ms",
        summary=summary,
        timestamp=_now(),
        details=details,
    )


def _risk_from(analysis: IntentAnalysis) -> EscalationRisk:
    prob = min(
        1.0,
        0.4 * analysis.frustration
        + 0.3 * analysis.urgency
        + (0.3 if analysis.sentiment == "very_negative" else 0.0),
    )
    if prob >= 0.8:
        level, action = "critical", "Escalate to senior specialist immediately"
    elif prob >= 0.6:
        level, action = "high", "Offer callback and involve team lead"
    elif prob >= 0.35:
        level, action = "medium", "Acknowledge, resolve within this turn"
    else:
        level, action = "low", "Continue standard flow"
    return EscalationRisk(
        probability=round(prob, 3),
        level=level,  # type: ignore[arg-type]
        reasoning=f"Sentiment={analysis.sentiment}, frustration={analysis.frustration}, urgency={analysis.urgency}",
        recommended_action=action,
    )


def _pipeline(customer_message: str, trace: list[AgentTraceEntry]):
    """Intent -> Knowledge -> Coaching -> Risk with trace recording."""
    t0 = time.perf_counter()
    analysis = analyze_intent(customer_message)
    trace.append(_trace(
        "Intent Detection Agent", t0,
        f"Detected {analysis.intent}",
        {
            "input": customer_message,
            "intent": analysis.intent,
            "sentiment": analysis.sentiment,
            "confidence": analysis.confidence,
        },
    ))

    t1 = time.perf_counter()
    knowledge, kb_payload = recommend(customer_message, k=3)
    top = knowledge[0] if knowledge else None
    trace.append(_trace(
        "Knowledge Recommendation Agent", t1,
        f"Retrieved {len(knowledge)} relevant documents",
        {
            "query": customer_message,
            "retrieved": [
                {"title": c.title, "similarity": c.similarity, "source": c.source}
                for c in knowledge
            ],
            "top_match": top.title if top else None,
            "top_similarity": top.similarity if top else None,
        },
    ))

    t2 = time.perf_counter()
    coaching = coach(customer_message, analysis)
    trace.append(_trace(
        "Coaching Agent", t2,
        "Generated coaching suggestions",
        {
            "suggested_response": coaching.suggested_response,
            "tone_notes": coaching.tone_notes,
            "grammar_notes": coaching.grammar_notes,
            "empathy_notes": coaching.empathy_notes,
            "professional_notes": coaching.professional_notes,
        },
    ))

    risk = _risk_from(analysis)
    return analysis, knowledge, kb_payload["documents"], risk, coaching


def handle_chat(
    req: ChatRequest,
    persona: str | None = None,
    scenario: str | None = None,
) -> ChatTurnResponse:
    turn = _new_msg(req.role, req.message)
    sess = store.get_session(req.session_id)
    mode = sess.config.mode if sess else "manual"
    trace: list[AgentTraceEntry] = []

    # Replay mode: no AI calls.
    if mode == "replay":
        empty_analysis = IntentAnalysis(intent="General Inquiry", sentiment="neutral")
        risk = _risk_from(empty_analysis)
        from ..agents.coaching_agent import _fallback as _coach_fb  # type: ignore
        coaching = _coach_fb(req.message, empty_analysis)
        trace.append(AgentTraceEntry(
            agent="Replay",
            status="Skipped",
            execution_time="0 ms",
            summary="Replay mode — displaying recorded execution history",
            timestamp=_now(),
        ))
        return ChatTurnResponse(
            turn=turn,
            analysis=empty_analysis,
            coaching=coaching,
            knowledge=[],
            risk=risk,
            customer_message=req.message if req.role == "customer" else None,
            intent_analysis=empty_analysis,
            risk_level=risk.level,
            agent_trace=trace,
        )

    # Manual mode OR customer speaking in simulator: analyze incoming message.
    if req.role == "customer" or mode == "manual":
        analysis, knowledge, kb_docs, risk, coaching = _pipeline(req.message, trace)
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

    # Simulator mode + agent turn:
    history = [
        {"role": m.role, "content": m.content}
        for m in (sess.messages if sess and hasattr(sess, "messages") else [])
    ]
    t0 = time.perf_counter()
    sim = simulate_customer(persona, scenario, req.message, history=history)
    simulated_content = sim.get("customer_message") or ""
    trace.append(_trace(
        "Customer Simulator Agent", t0,
        "Generated realistic customer reply",
        {
            "input": req.message,
            "generated_reply": simulated_content,
            "emotion": sim.get("emotion"),
            "conversation_stage": sim.get("conversation_stage"),
        },
    ))
    simulated = _new_msg("customer", simulated_content)

    analysis, knowledge, kb_docs, risk, coaching = _pipeline(simulated_content, trace)
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
