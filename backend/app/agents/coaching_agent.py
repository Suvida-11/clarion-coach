"""Coaching Agent — generates suggested agent response + coaching feedback via Gemini."""
from __future__ import annotations
from ..prompts.system_prompts import COACHING_AGENT_SYSTEM_PROMPT as SYSTEM
from ..schemas.chat import CoachingSuggestion, IntentAnalysis
from ..services.gemini_service import generate_json


def _fallback(message: str, analysis: IntentAnalysis) -> CoachingSuggestion:
    return CoachingSuggestion(
        suggested_response=(
            "I completely understand how frustrating this must be, and I'm truly sorry "
            "for the trouble. Let me take a closer look right away and get this resolved for you."
        ),
        tone_notes=["Lead with empathy", "Avoid corporate jargon"],
        grammar_notes=["Use active voice", "Keep sentences under 20 words"],
        empathy_notes=[
            "Acknowledge the customer's feelings before proposing a solution",
            "Mirror the customer's urgency without matching their frustration",
        ],
        professional_notes=[
            f"Detected intent: {analysis.intent}",
            "Confirm next steps and set a clear expectation",
        ],
    )


def coach(message: str, analysis: IntentAnalysis) -> CoachingSuggestion:
    prompt = (
        f'Customer message: """{message}"""\n'
        f"Detected intent: {analysis.intent}\n"
        f"Sentiment: {analysis.sentiment} (score={analysis.sentiment_score})\n"
        f"Frustration: {analysis.frustration}, Urgency: {analysis.urgency}\n"
    )
    data = generate_json(prompt, system=SYSTEM)
    if not data:
        return _fallback(message, analysis)
    try:
        data.pop("empathy_score", None)
        for k in ("tone_notes", "grammar_notes", "empathy_notes", "professional_notes"):
            v = data.get(k)
            if isinstance(v, str):
                data[k] = [v]
            elif not isinstance(v, list):
                data[k] = []
        return CoachingSuggestion(**data)
    except Exception:
        return _fallback(message, analysis)
