"""Orchestrator: coordinates the 6-agent pipeline.

Simulator mode:  Customer Simulator -> Intent -> Knowledge -> Coaching -> Risk
Manual mode:     Intent -> Knowledge -> Coaching -> Risk
Replay mode:     Replays stored turns (no Gemini calls)
"""
from __future__ import annotations
import uuid
from datetime import datetime, timezone

from ..agents.coaching_agent import coach
from ..agents.customer_simulator_agent import simulate_customer
from ..agents.intent_agent import analyze_intent
from ..agents.knowledge_recommendation_agent import recommend
from ..schemas.chat import (
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


def _pipeline(customer_message: str) -> tuple[IntentAnalysis, list, list, EscalationRisk, object]:
    """Intent -> Knowledge -> Coaching -> Risk."""
    analysis = analyze_intent(customer_message)
    knowledge, kb_payload = recommend(customer_message, k=3)
    coaching = coach(customer_message, analysis)
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

    # Replay mode: no AI calls, echo minimal structure.
    if mode == "replay":
        empty_analysis = IntentAnalysis(intent="General Inquiry", sentiment="neutral")
        risk = _risk_from(empty_analysis)
        from ..agents.coaching_agent import _fallback as _coach_fb  # type: ignore
        coaching = _coach_fb(req.message, empty_analysis)
        return ChatTurnResponse(
            turn=turn,
            analysis=empty_analysis,
            coaching=coaching,
            knowledge=[],
            risk=risk,
            customer_message=req.message if req.role == "customer" else None,
            intent_analysis=empty_analysis,
            risk_level=risk.level,
        )

    # Manual mode OR customer speaking in simulator: analyze the incoming message.
    if req.role == "customer" or mode == "manual":
        analysis, knowledge, kb_docs, risk, coaching = _pipeline(req.message)
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
        )

    # Simulator mode + agent turn:
    # 1) Customer Simulator generates the next customer reply.
    # 2) Run the full pipeline over that simulated message.
    history = [
        {"role": m.role, "content": m.content}
        for m in (sess.messages if sess and hasattr(sess, "messages") else [])
    ]
    sim = simulate_customer(persona, scenario, req.message, history=history)
    simulated_content = sim.get("customer_message") or ""
    simulated = _new_msg("customer", simulated_content)

    analysis, knowledge, kb_docs, risk, coaching = _pipeline(simulated_content)
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
    )
