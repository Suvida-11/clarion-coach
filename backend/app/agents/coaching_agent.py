"""Coaching Agent — suggested agent response + multi-dimensional coaching evaluation.

Extended for Milestone 3: evaluates tone, clarity, grammar, professionalism and
empathy (0-100 each), returns communication improvement tips, an overall
coaching score (0-100) and an explanation of that score. Still Gemini-backed and
still returns the existing `CoachingSuggestion` shape (additive fields only).
"""
from __future__ import annotations
from typing import Iterable
import random

from ..prompts.system_prompts import COACHING_AGENT_SYSTEM_PROMPT as SYSTEM
from ..schemas.chat import CoachingScores, CoachingSuggestion, IntentAnalysis
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
_CLARITY_POOL = [
    "One idea per sentence — split anything over 20 words",
    "State the action first, then the reason",
    "Number the steps when giving instructions",
    "Replace internal jargon with the customer's own words",
    "End with a single, unambiguous next step",
]
_TIP_POOL = [
    "Lead with the fix before the apology when trust is low",
    "Offer an immediate workaround before describing internal process",
    "Replace passive promises with a booked, verifiable action",
    "Reflect the customer's deadline back to them explicitly",
    "Close with a safety net rather than a hard goodbye",
]


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    try:
        return max(lo, min(hi, float(v)))
    except Exception:
        return lo


def _heuristic_scores(analysis: IntentAnalysis) -> CoachingScores:
    """Derive plausible dimension scores from the detected emotional state."""
    base = 82.0 - 25.0 * analysis.frustration + 8.0 * max(0.0, analysis.sentiment_score)
    return CoachingScores(
        tone=round(_clamp(base + 3), 1),
        clarity=round(_clamp(base + 5), 1),
        grammar=round(_clamp(base + 9), 1),
        professionalism=round(_clamp(base + 2), 1),
        empathy=round(_clamp(base - 6 * analysis.urgency + 4), 1),
    )


def _overall(scores: CoachingScores) -> float:
    vals = [scores.tone, scores.clarity, scores.grammar, scores.professionalism, scores.empathy]
    return round(sum(vals) / len(vals), 1)


def _fallback(message: str, analysis: IntentAnalysis, seen: set[str] | None = None) -> CoachingSuggestion:
    seen = seen or set()

    def pick(pool: list[str], n: int = 2) -> list[str]:
        remaining = [p for p in pool if p not in seen]
        random.shuffle(remaining)
        return remaining[:n] if remaining else pool[:n]

    scores = _heuristic_scores(analysis)
    overall = _overall(scores)
    return CoachingSuggestion(
        suggested_response=(
            "I hear you, and I want to make this right. Let me pull up your details "
            "and walk you through the next step so we can resolve this today."
        ),
        tone_notes=["Lead with warmth", "Keep it human — avoid corporate jargon"],
        clarity_notes=pick(_CLARITY_POOL),
        grammar_notes=["Use active voice", "Keep sentences under 20 words"],
        empathy_notes=pick(_EMPATHY_POOL),
        professional_notes=pick(_PROFESSIONAL_POOL) + [f"Detected intent: {analysis.intent}"],
        improvement_tips=pick(_TIP_POOL),
        scores=scores,
        coaching_score=overall,
        score_reasoning=(
            f"Scored {overall}/100 from tone, clarity, grammar, professionalism and empathy, "
            f"adjusted for {analysis.sentiment} sentiment and frustration at {analysis.frustration}."
        ),
    )


def coach(
    message: str,
    analysis: IntentAnalysis,
    history: Iterable[dict] | None = None,
    previous_suggestions: Iterable[str] | None = None,
    previous_tips: Iterable[str] | None = None,
    knowledge_titles: Iterable[str] | None = None,
) -> CoachingSuggestion:
    hist_txt = ""
    if history:
        hist_txt = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in history)
    prev_sugg = list(previous_suggestions or [])
    prev_tips = list(previous_tips or [])
    kb = list(knowledge_titles or [])
    seen = set(prev_sugg) | set(prev_tips)

    prompt = (
        f'Customer message: """{message}"""\n'
        f"Detected intent: {analysis.intent}\n"
        f"Sentiment: {analysis.sentiment} (score={analysis.sentiment_score})\n"
        f"Frustration: {analysis.frustration}, Urgency: {analysis.urgency}\n"
        f"Retrieved knowledge: {', '.join(kb) if kb else '(none)'}\n\n"
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
        for k in (
            "tone_notes",
            "clarity_notes",
            "grammar_notes",
            "empathy_notes",
            "professional_notes",
            "improvement_tips",
        ):
            v = data.get(k)
            if isinstance(v, str):
                data[k] = [v]
            elif not isinstance(v, list):
                data[k] = []
            else:
                # dedupe against tips already shown this session
                data[k] = [x for x in v if isinstance(x, str) and x.strip() and x not in seen]

        # Normalize the five evaluation dimensions.
        raw_scores = data.get("scores")
        if isinstance(raw_scores, dict):
            fb = _heuristic_scores(analysis)
            scores = CoachingScores(
                tone=round(_clamp(raw_scores.get("tone", fb.tone)), 1),
                clarity=round(_clamp(raw_scores.get("clarity", fb.clarity)), 1),
                grammar=round(_clamp(raw_scores.get("grammar", fb.grammar)), 1),
                professionalism=round(_clamp(raw_scores.get("professionalism", fb.professionalism)), 1),
                empathy=round(_clamp(raw_scores.get("empathy", fb.empathy)), 1),
            )
        else:
            scores = _heuristic_scores(analysis)
        data["scores"] = scores

        overall = data.get("coaching_score")
        overall = _clamp(overall) if isinstance(overall, (int, float)) else _overall(scores)
        # keep the headline score consistent with the dimension average
        if abs(overall - _overall(scores)) > 12:
            overall = round((overall + _overall(scores)) / 2, 1)
        data["coaching_score"] = round(overall, 1)

        reasoning = (data.get("score_reasoning") or "").strip()
        if not reasoning:
            reasoning = (
                f"Scored {data['coaching_score']}/100 across tone, clarity, grammar, "
                f"professionalism and empathy for a {analysis.sentiment} "
                f"{analysis.intent} conversation."
            )
        data["score_reasoning"] = reasoning

        sr = (data.get("suggested_response") or "").strip()
        if not sr or sr in prev_sugg:
            data["suggested_response"] = _fallback(message, analysis, seen).suggested_response
        return CoachingSuggestion(**data)
    except Exception:
        return _fallback(message, analysis, seen)
