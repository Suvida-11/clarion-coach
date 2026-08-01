"""Escalation Risk Monitor Agent.

Runs after every conversation turn. Combines the current turn's signals with the
conversation trajectory (rising frustration, repeated complaints, resolution
status) into an escalation probability, risk level, reasoning and one
recommended action. Heuristics always produce a valid result; Gemini refines the
reasoning and action when available.
"""
from __future__ import annotations

import re
from typing import Any, Iterable, Sequence

from ..prompts.system_prompts import ESCALATION_MONITOR_SYSTEM_PROMPT as SYSTEM
from ..schemas.chat import EscalationRisk, IntentAnalysis
from ..services.gemini_service import generate_json

_CHURN_PATTERNS = [
    "cancel", "chargeback", "dispute", "refund my", "lawyer", "legal",
    "sue", "twitter", "review", "regulator", "ombudsman", "escalate",
    "supervisor", "manager",
]
_RESOLVED_PATTERNS = ["that worked", "thanks", "thank you", "resolved", "sorted", "fixed", "all good"]
_LEVELS = ("low", "medium", "high", "critical")


def _level_for(prob: float) -> str:
    if prob >= 0.80:
        return "critical"
    if prob >= 0.60:
        return "high"
    if prob >= 0.35:
        return "medium"
    return "low"


def _action_for(level: str) -> str:
    return {
        "critical": "Escalate to a senior specialist immediately and confirm the outcome in writing",
        "high": "Offer a booked callback with a named owner and involve the team lead",
        "medium": "Acknowledge the impact and resolve within this turn",
        "low": "Continue the standard flow and confirm the request details",
    }[level]


def _repeated_complaints(intents: Sequence[str], current_intent: str, messages: Sequence[str]) -> int:
    """How many times this same complaint has resurfaced."""
    repeats = max(0, sum(1 for i in intents if i == current_intent) - 1)
    joined = " ".join(m.lower() for m in messages)
    for phrase in ("again", "third time", "second time", "still not", "nobody", "as i said"):
        if phrase in joined:
            repeats += 1
            break
    return repeats


def _resolution_status(latest: str, frustration: float) -> str:
    low = latest.lower()
    if any(p in low for p in _RESOLVED_PATTERNS) and frustration < 0.4:
        return "resolved"
    if frustration < 0.55:
        return "in_progress"
    return "unresolved"


def _heuristic(
    message: str,
    analysis: IntentAnalysis,
    frustration_series: Sequence[float],
    intents: Sequence[str],
    messages: Sequence[str],
) -> tuple[float, int, str, list[str]]:
    signals: list[str] = []
    prob = (
        0.40 * analysis.frustration
        + 0.25 * analysis.urgency
        + (0.25 if analysis.sentiment == "very_negative" else 0.0)
        + (0.10 if analysis.sentiment == "negative" else 0.0)
    )
    if analysis.sentiment in ("negative", "very_negative"):
        signals.append(f"{analysis.sentiment}_sentiment")
    if analysis.urgency >= 0.7:
        signals.append("high_urgency")

    # Trajectory: rising frustration adds risk even on a polite turn.
    if len(frustration_series) >= 2:
        delta = frustration_series[-1] - frustration_series[0]
        if delta > 0.15:
            prob += min(0.15, delta * 0.4)
            signals.append("rising_frustration")
        elif delta < -0.15:
            prob -= 0.08
            signals.append("cooling_frustration")

    repeats = _repeated_complaints(intents, analysis.intent, messages)
    if repeats:
        prob += min(0.30, 0.12 * repeats)
        signals.append("repeated_complaint")

    low = message.lower()
    if any(re.search(rf"\b{re.escape(p)}", low) for p in _CHURN_PATTERNS):
        prob = max(prob, 0.62)
        signals.append("churn_or_escalation_threat")

    status = _resolution_status(message, analysis.frustration)
    if status == "resolved":
        prob = min(prob, 0.35)
        signals.append("confirmed_resolution")

    prob = round(max(0.0, min(1.0, prob)), 3)
    if not signals:
        signals.append("stable_conversation")
    return prob, repeats, status, signals


def monitor(
    message: str,
    analysis: IntentAnalysis,
    history: Iterable[dict] | None = None,
    frustration_series: Iterable[float] | None = None,
    intents: Iterable[str] | None = None,
    turn_number: int = 1,
) -> EscalationRisk:
    hist = list(history or [])
    fr = list(frustration_series or []) + [analysis.frustration]
    ints = list(intents or [])
    msgs = [str(m.get("content", "")) for m in hist] + [message]

    prob, repeats, status, signals = _heuristic(message, analysis, fr, ints, msgs)
    level = _level_for(prob)
    reasoning = (
        f"Sentiment={analysis.sentiment}, frustration={analysis.frustration}, "
        f"urgency={analysis.urgency}, repeated complaints={repeats}, "
        f"resolution={status}, signals={', '.join(signals)}."
    )
    baseline = EscalationRisk(
        probability=prob,
        level=level,  # type: ignore[arg-type]
        reasoning=reasoning,
        recommended_action=_action_for(level),
        repeated_complaints=repeats,
        resolution_status=status,  # type: ignore[arg-type]
        signals=signals,
    )

    prompt = (
        f'Latest customer message: """{message}"""\n'
        f"Intent: {analysis.intent}\n"
        f"Sentiment: {analysis.sentiment} (score={analysis.sentiment_score})\n"
        f"Frustration: {analysis.frustration}, Urgency: {analysis.urgency}\n"
        f"Turn number: {turn_number}\n"
        f"Trajectory (oldest to newest): frustration={fr}, intents={ints}\n"
        f"Repeat signals: repeated_intent_count={repeats}, heuristic_signals={signals}\n"
        f"Heuristic baseline probability: {prob}\n\n"
        "Conversation history:\n"
        + ("\n".join(f"{m.get('role')}: {m.get('content')}" for m in hist) or "(none)")
    )
    data: dict[str, Any] | None = generate_json(prompt, system=SYSTEM)
    if not data:
        return baseline
    try:
        p = data.get("probability")
        p = float(p) if isinstance(p, (int, float)) else prob
        # blend the model's judgement with the deterministic baseline
        p = round(max(0.0, min(1.0, (p + prob) / 2)), 3)
        lvl = data.get("level")
        if lvl not in _LEVELS or _level_for(p) != lvl:
            lvl = _level_for(p)
        rc = data.get("repeated_complaints")
        rc = int(rc) if isinstance(rc, (int, float)) else repeats
        st = data.get("resolution_status")
        if st not in ("unresolved", "in_progress", "resolved"):
            st = status
        sig = data.get("signals")
        sig = [s for s in sig if isinstance(s, str)] if isinstance(sig, list) else []
        return EscalationRisk(
            probability=p,
            level=lvl,  # type: ignore[arg-type]
            reasoning=(data.get("reasoning") or reasoning).strip(),
            recommended_action=(data.get("recommended_action") or _action_for(lvl)).strip(),
            repeated_complaints=max(0, rc),
            resolution_status=st,  # type: ignore[arg-type]
            signals=sig or signals,
        )
    except Exception:
        return baseline
