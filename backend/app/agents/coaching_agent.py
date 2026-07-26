"""Coaching Agent — generates suggested agent response + coaching feedback via Gemini."""
from __future__ import annotations
from typing import Iterable
import random

from ..prompts.system_prompts import COACHING_AGENT_SYSTEM_PROMPT as SYSTEM
from ..schemas.chat import CoachingSuggestion, IntentAnalysis
from ..services.gemini_service import generate_json


_EMPATHY_POOL = [
    "Acknowledge the customer's feelings before proposing a solution",
    "Mirror the customer's urgency without matching their frustration",
    "Name the emotion you're hearing so they feel understood",
    "Thank them for their patience and confirm you're on it",
    "Offer a small choice to restore their sense of control",
]
_PROFESSIONAL_POOL = [
    "Confirm next steps and set a clear expectation",
    "Summarize what you've heard back to them",
    "Give a realistic timeline, not a vague promise",
    "Invite one clarifying question before proposing a fix",
    "Close with a specific follow-up commitment",
]


def _fallback(message: str, analysis: IntentAnalysis, seen: set[str]) -> CoachingSuggestion:
    def pick(pool: list[str], n: int = 2) -> list[str]:
        remaining = [p for p in pool if p not in seen]
        random.shuffle(remaining)
        return remaining[:n] if remaining else pool[:n]

    return CoachingSuggestion(
        suggested_response=(
            "I hear you, and I want to make this right. Let me pull up your details "
            "and walk you through the next step so we can resolve this today."
        ),
        tone_notes=["Lead with warmth", "Keep it human — avoid corporate jargon"],
        grammar_notes=["Use active voice", "Keep sentences under 20 words"],
        empathy_notes=pick(_EMPATHY_POOL),
        professional_notes=pick(_PROFESSIONAL_POOL) + [f"Detected intent: {analysis.intent}"],
    )


def coach(
    message: str,
    analysis: IntentAnalysis,
    history: Iterable[dict] | None = None,
    previous_suggestions: Iterable[str] | None = None,
    previous_tips: Iterable[str] | None = None,
) -> CoachingSuggestion:
    hist_txt = ""
    if history:
        hist_txt = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in history)
    prev_sugg = list(previous_suggestions or [])
    prev_tips = list(previous_tips or [])
    seen = set(prev_sugg) | set(prev_tips)

    prompt = (
        f'Customer message: """{message}"""\n'
        f"Detected intent: {analysis.intent}\n"
        f"Sentiment: {analysis.sentiment} (score={analysis.sentiment_score})\n"
        f"Frustration: {analysis.frustration}, Urgency: {analysis.urgency}\n\n"
        f"Conversation history so far:\n{hist_txt or '(none)'}\n\n"
        f"Previous suggested responses (DO NOT repeat wording):\n"
        + ("\n".join(f"- {s}" for s in prev_sugg) if prev_sugg else "(none)")
        + "\n\nPrevious coaching tips already shown (rotate to fresh angles):\n"
        + ("\n".join(f"- {t}" for t in prev_tips) if prev_tips else "(none)")
    )
    data = generate_json(prompt, system=SYSTEM)
    if not data:
        return _fallback(message, analysis, seen)
    try:
        data.pop("empathy_score", None)
        for k in ("tone_notes", "grammar_notes", "empathy_notes", "professional_notes"):
            v = data.get(k)
            if isinstance(v, str):
                data[k] = [v]
            elif not isinstance(v, list):
                data[k] = []
            else:
                # dedupe against seen tips
                data[k] = [x for x in v if isinstance(x, str) and x.strip() and x not in seen]
        # if model echoed a suggestion we already had, nudge with fallback text
        sr = (data.get("suggested_response") or "").strip()
        if sr and sr in prev_sugg:
            data["suggested_response"] = _fallback(message, analysis, seen).suggested_response
        return CoachingSuggestion(**data)
    except Exception:
        return _fallback(message, analysis, seen)
