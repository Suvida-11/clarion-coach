"""Coaching Agent — suggested agent response + multi-dimensional coaching evaluation.

Extended for Milestone 3: evaluates tone, clarity, grammar, professionalism and
empathy (0-100 each), returns communication improvement tips, an overall
coaching score (0-100) and an explanation of that score. Still Gemini-backed and
still returns the existing `CoachingSuggestion` shape (additive fields only).
"""
from __future__ import annotations
from typing import Iterable
import random
import re

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


# Evaluation never legitimately produces 0 for a real reply; keep a realistic floor.
_SCORE_FLOOR = 60.0


def _heuristic_scores(
    analysis: IntentAnalysis,
    message: str = "",
    knowledge_titles: Iterable[str] | None = None,
) -> CoachingScores:
    """Derive plausible dimension scores from the message and emotional state."""
    text = (message or "").strip()
    lower = text.lower()
    words = [w for w in text.split() if w]
    sentences = [s for s in text.replace("!", ".").replace("?", ".").split(".") if s.strip()]
    avg_sentence = (len(words) / len(sentences)) if sentences else len(words)

    empathy_hits = sum(
        1 for w in ("sorry", "understand", "apolog", "appreciate", "frustrat", "thank", "hear you")
        if w in lower
    )
    action_hits = sum(
        1 for w in ("i will", "i'll", "i've", "let me", "issued", "sending", "confirm", "arrange", "processing")
        if w in lower
    )
    specific = any(c.isdigit() for c in text) or any(
        w in lower for w in ("today", "tomorrow", "reference", "within")
    )
    polite = any(w in lower for w in ("please", "thank", "happy to", "of course"))
    titles = [t for t in (knowledge_titles or []) if t]
    grounded = any(
        any(tok in lower for tok in [w.lower() for w in t.split() if len(w) > 4]) for t in titles
    )
    length_fit = 0.3 if len(words) < 6 else 0.7 if len(words) < 15 else 1.0 if len(words) <= 70 else 0.75

    base = 4.0 * max(0.0, analysis.sentiment_score) - 3.0 * analysis.frustration

    def s(v: float) -> float:
        return round(_clamp(v + base, _SCORE_FLOOR, 100.0), 1)

    return CoachingScores(
        tone=s(70 + empathy_hits * 5 + (6 if polite else 0) + length_fit * 8),
        clarity=s(68 + (12 if avg_sentence <= 20 else 5 if avg_sentence <= 28 else -4)
                  + (10 if specific else 0) + length_fit * 6),
        grammar=s(78 + (10 if avg_sentence <= 22 else 0) + (6 if text.endswith((".", "!", "?")) else -3)),
        professionalism=s(72 + action_hits * 4 + (8 if specific else 0) + (4 if polite else 0) + length_fit * 5),
        empathy=s(64 + empathy_hits * 8 + (5 if polite else 0) + length_fit * 6
                  - 6 * analysis.urgency),
        knowledge_grounding=s(64 + (22 if grounded else 0) + (8 if specific else 0) + action_hits * 2),
        resolution_quality=s(63 + action_hits * 6 + (12 if specific else 0) + (4 if empathy_hits else 0)),
    )


def _overall(scores: CoachingScores) -> float:
    vals = [
        scores.tone,
        scores.clarity,
        scores.grammar,
        scores.professionalism,
        scores.empathy,
        scores.knowledge_grounding,
        scores.resolution_quality,
    ]
    vals = [v for v in vals if v > 0]
    if not vals:
        return _SCORE_FLOOR
    return round(sum(vals) / len(vals), 1)



def _fallback(
    message: str,
    analysis: IntentAnalysis,
    seen: set[str] | None = None,
    agent_message: str = "",
    knowledge_titles: Iterable[str] | None = None,
) -> CoachingSuggestion:
    seen = seen or set()

    def pick(pool: list[str], n: int = 2) -> list[str]:
        remaining = [p for p in pool if p not in seen]
        random.shuffle(remaining)
        return remaining[:n] if remaining else pool[:n]

    titles = [t for t in (knowledge_titles or []) if t]
    scores = _heuristic_scores(analysis, agent_message, titles)
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
            f"Scored {overall}/100 across tone, clarity, grammar, professionalism, empathy, "
            f"knowledge grounding and resolution quality"
            + (f" against \"{titles[0]}\"" if titles else "")
            + f", adjusted for {analysis.sentiment} sentiment and frustration at {analysis.frustration}."
        ),
    )


def coach(
    message: str,
    analysis: IntentAnalysis,
    history: Iterable[dict] | None = None,
    previous_suggestions: Iterable[str] | None = None,
    previous_tips: Iterable[str] | None = None,
    knowledge_titles: Iterable[str] | None = None,
    agent_message: str = "",
    knowledge_previews: Iterable[str] | None = None,
    agent_name: str | None = None,
) -> CoachingSuggestion:
    hist_txt = ""
    if history:
        hist_txt = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in history)
    prev_sugg = list(previous_suggestions or [])
    prev_tips = list(previous_tips or [])
    kb = list(knowledge_titles or [])
    kb_prev = list(knowledge_previews or [])
    seen = set(prev_sugg) | set(prev_tips)

    prompt = (
        f"agent_name: {agent_name or '(not provided)'}\n"
        "Customer name: UNKNOWN unless it appears verbatim in the conversation below.\n"
        "Order ID / Transaction ID / tracking number: UNKNOWN unless present below.\n"
        "Never invent names, IDs, products, policies, dates or timelines. Never use "
        "agent_name as the customer's name and never place agent_name inside "
        "suggested_response — it may only appear in coaching feedback.\n\n"
        + f'Customer message: """{message}"""\n'
        + f'Support agent reply: """{agent_message or "(none)"}"""\n'
        + f"Detected intent: {analysis.intent}\n"
        + f"Sentiment: {analysis.sentiment} (score={analysis.sentiment_score})\n"
        + f"Frustration: {analysis.frustration}, Urgency: {analysis.urgency}\n"
        + f"Retrieved knowledge: {', '.join(kb) if kb else '(none)'}\n"
        + (
            "Knowledge excerpts:\n" + "\n".join(f"- {t}" for t in kb_prev[:3]) + "\n"
            if kb_prev
            else ""
        )
        + f"\nConversation history:\n{hist_txt or '(none)'}\n"
        + (
            "\nPrevious suggested responses (do NOT repeat wording):\n"
            + "\n".join(f"- {p}" for p in prev_sugg[-5:])
            + "\n"
            if prev_sugg
            else ""
        )
        + (
            "\nPrevious coaching tips already shown (rotate to fresh angles):\n"
            + "\n".join(f"- {t}" for t in prev_tips[-8:])
            + "\n"
            if prev_tips
            else ""
        )
    )

    data = generate_json(prompt, system=SYSTEM)
    if not data:
        return _fallback(message, analysis, seen, agent_message, kb)
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

        # Normalize the seven evaluation dimensions, never allowing a 0 score
        # through for a genuine reply.
        fb = _heuristic_scores(analysis, agent_message, kb)
        raw_scores = data.get("scores") if isinstance(data.get("scores"), dict) else {}

        def dim(name: str, default: float) -> float:
            raw = raw_scores.get(name)
            if not isinstance(raw, (int, float)) or float(raw) <= 0:
                return default
            value = float(raw) * 100 if float(raw) <= 1 else float(raw)
            return round(_clamp(value, _SCORE_FLOOR, 100.0), 1)

        scores = CoachingScores(
            tone=dim("tone", fb.tone),
            clarity=dim("clarity", fb.clarity),
            grammar=dim("grammar", fb.grammar),
            professionalism=dim("professionalism", fb.professionalism),
            empathy=dim("empathy", fb.empathy),
            knowledge_grounding=dim("knowledge_grounding", fb.knowledge_grounding),
            resolution_quality=dim("resolution_quality", fb.resolution_quality),
        )
        data["scores"] = scores

        overall = data.get("coaching_score")
        if isinstance(overall, (int, float)) and float(overall) > 0:
            overall = float(overall) * 100 if float(overall) <= 1 else float(overall)
            overall = _clamp(overall, _SCORE_FLOOR, 100.0)
        else:
            overall = _overall(scores)
        # keep the headline score consistent with the dimension average
        if abs(overall - _overall(scores)) > 12:
            overall = round((overall + _overall(scores)) / 2, 1)
        data["coaching_score"] = round(_clamp(overall, _SCORE_FLOOR, 100.0), 1)

        reasoning = (data.get("score_reasoning") or "").strip()
              
        if not reasoning:
            reasoning = (
                f"Scored {data['coaching_score']}/100 across tone, clarity, grammar, "
                f"professionalism, empathy, knowledge grounding and resolution quality for a "
                f"{analysis.sentiment} {analysis.intent} conversation."
            )
        data["score_reasoning"] = reasoning

        sr = (data.get("suggested_response") or "").strip()
    

        sr = re.sub(r"^(Hi|Hello|Hey|Dear|Thanks.*?,|Thank you.*?,|I appreciate.*?,)\s*[A-Z][a-z]+\s*[—,-]?\s*",
    "",
    sr,
    flags=re.IGNORECASE,
)


        sr = re.sub(r"\bORD-\d+\b", "your order", sr)
        sr = re.sub(r"\bTXN-\d+\b", "your transaction", sr)

        data["suggested_response"] = sr
        if not sr or sr in prev_sugg:
            data["suggested_response"] = _fallback(
                message, analysis, seen, agent_message, kb
            ).suggested_response
        return CoachingSuggestion(**data)
    except Exception:
        return _fallback(message, analysis, seen, agent_message, kb)

