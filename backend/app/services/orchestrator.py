"""Orchestrator: coordinates intent + coaching agents, RAG, risk, and simulator."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone

from ..agents.coaching_agent import coach
from ..agents.intent_agent import analyze_intent
from ..schemas.chat import (
    ChatMessage,
    ChatRequest,
    ChatTurnResponse,
    EscalationRisk,
    IntentAnalysis,
    RetrievedChunk,
)
from . import rag
from .gemini_service import generate_text


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
    prob = min(1.0, 0.4 * analysis.frustration + 0.3 * analysis.urgency + (0.3 if analysis.sentiment == "very_negative" else 0.0))
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


def _simulate_customer(persona: str | None, scenario: str | None, agent_reply: str) -> str:
    prompt = (
        f"You are simulating a customer with persona '{persona or 'Angry'}'. "
        f"Scenario: {scenario or 'A support issue'}. "
        f"The support agent just said: \"{agent_reply}\". "
        "Reply in 1-3 sentences as the customer would, staying in character. No prefix."
    )
    text = generate_text(prompt)
    return text or "That's not really solving my problem. Can you actually help me here?"


def handle_chat(req: ChatRequest, persona: str | None = None, scenario: str | None = None) -> ChatTurnResponse:
    turn = _new_msg(req.role, req.message)

    if req.role == "customer":
        # Customer speaks -> analyze + coach agent
        analysis = analyze_intent(req.message)
        coaching = coach(req.message, analysis)
        knowledge = rag.search(req.message, k=4)
        risk = _risk_from(analysis)
        return ChatTurnResponse(
            turn=turn, analysis=analysis, coaching=coaching,
            knowledge=knowledge, risk=risk,
        )

    # role == "agent": simulate customer reply, then analyze that reply
    simulated_content = _simulate_customer(persona, scenario, req.message)
    simulated = _new_msg("customer", simulated_content)
    analysis = analyze_intent(simulated_content)
    coaching = coach(simulated_content, analysis)
    knowledge = rag.search(simulated_content, k=4)
    risk = _risk_from(analysis)
    return ChatTurnResponse(
        turn=turn,
        simulated_customer_reply=simulated,
        analysis=analysis,
        coaching=coaching,
        knowledge=knowledge,
        risk=risk,
    )
