"""Customer Simulator Agent.

Generates realistic, non-repeating customer replies during Simulator Mode.
The reply is shaped by the issue/scenario, persona, product, difficulty,
full conversation history, the agent's previous replies and the customer's
own emotional progression. Uses the centralized Gemini service and pulls its
system prompt from `app.prompts.system_prompts`.
"""
from __future__ import annotations

import random
from typing import Any, Iterable

from ..prompts.system_prompts import CUSTOMER_SIMULATOR_SYSTEM_PROMPT
from ..services.gemini_service import generate_json, generate_text

SCENARIOS = {
    "Refund Request", "Technical Support", "Payment Failure",
    "Product Inquiry", "Delivery Delay", "Complaint",
    "Order Tracking", "Account Locked", "Password Reset",
    "Subscription Cancellation", "Damaged Product", "Billing Issue",
    "Shipping Complaint", "VIP Customer", "Complaint Escalation",
    "Login Issue",
}
PERSONAS = {
    "Calm", "Angry", "Frustrated", "Confused", "Friendly",
    "Technical", "Impatient", "VIP Customer", "Beginner",
}

_DIFFICULTY_WEIGHT = {"Easy": 0.6, "Medium": 0.8, "Hard": 1.0, "Expert": 1.15}

# Varied fallbacks so the simulator never repeats the same two lines when
# Gemini is unavailable.
_PRESS_FALLBACKS = [
    "That's not really an answer. Can you tell me exactly what happens next and when?",
    "I've heard that before from someone else. What is actually being done this time?",
    "I need a reference or a date, not a reassurance. Can you give me one?",
    "So nothing has changed since I last got in touch? That's disappointing.",
    "Who can I speak to that's able to make a decision on this?",
]
_CALM_FALLBACKS = [
    "Okay, that's clearer — thanks for actually checking.",
    "Alright, if that lands when you say it will, we're fine.",
    "Good. Can you send that to me in writing so I have a record?",
    "That works for me. I appreciate you staying with it.",
]


def _fallback(
    persona: str,
    scenario: str,
    frustration: float,
    used: set[str],
) -> dict[str, Any]:
    pool = _PRESS_FALLBACKS if frustration > 0.45 else _CALM_FALLBACKS
    fresh = [p for p in pool if p not in used] or pool
    message = random.choice(fresh)
    emotion = (
        "angry" if frustration > 0.75
        else "frustrated" if frustration > 0.5
        else "confused" if persona in {"Confused", "Beginner"}
        else "neutral" if frustration > 0.25
        else "happy"
    )
    return {
        "customer_message": message,
        "emotion": emotion,
        "frustration_level": round(frustration, 2),
        "conversation_stage": "escalating" if frustration > 0.7 else "clarifying" if frustration > 0.35 else "resolving",
        "next_expected_intent": scenario or "General Inquiry",
    }


def simulate_customer(
    persona: str | None,
    scenario: str | None,
    agent_reply: str,
    history: Iterable[dict[str, str]] | None = None,
    emotion_level: float | None = None,
    product: str | None = None,
    difficulty: str | None = None,
    previous_customer_messages: Iterable[str] | None = None,
    turn_number: int = 1,
) -> dict[str, Any]:
    """Return the next customer turn as a structured dict."""
    persona = persona if persona in PERSONAS else "Angry"
    scenario = scenario if scenario in SCENARIOS else (scenario or "Complaint")
    weight = _DIFFICULTY_WEIGHT.get(difficulty or "Medium", 0.8)
    hist = list(history or [])
    previous = [m for m in (previous_customer_messages or []) if m]
    used = set(previous)

    hist_txt = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in hist) or "(none)"

    # Emotional progression: concrete, empathetic agent replies calm the
    # customer; vague ones keep frustration high.
    reply = (agent_reply or "").lower()
    quality = 0.0
    quality += 0.25 if any(w in reply for w in ("sorry", "understand", "apolog", "appreciate")) else 0.0
    quality += 0.3 if any(c.isdigit() for c in reply) or any(
        w in reply for w in ("today", "tomorrow", "reference", "within")
    ) else 0.0
    quality += 0.25 if any(w in reply for w in ("i'll", "i will", "i've", "let me", "issued", "sending")) else 0.0
    quality += 0.2 if len(reply.split()) >= 15 else 0.0

    base = emotion_level if emotion_level is not None else max(0.2, 0.85 - 0.05 * (turn_number - 1))
    frustration = max(0.08, min(0.97, base - (quality * 0.35 - 0.08) / max(0.6, weight)))

    prompt = (
        f"Scenario / issue: {scenario}\n"
        f"Persona: {persona}\n"
        f"Product: {product or 'the customer\\'s order'}\n"
        f"Difficulty: {difficulty or 'Medium'}\n"
        f"Turn number: {turn_number}\n"
        f"Current frustration level (0-1): {round(frustration, 2)}\n"
        f"Conversation so far:\n{hist_txt}\n\n"
        f'Agent just said: "{agent_reply}"\n\n'
        "Your previous messages in this session (DO NOT repeat this wording or "
        "these points):\n"
        + ("\n".join(f"- {m}" for m in previous[-6:]) if previous else "(none)")
        + "\n\nWrite the customer's next reply. It must be specific to this issue and "
        "product, reference something concrete from the conversation, and move the "
        "emotional arc: calmer if the agent gave a concrete commitment, more "
        "frustrated if the reply was vague. Return JSON per the schema."
    )
    data = generate_json(prompt, system=CUSTOMER_SIMULATOR_SYSTEM_PROMPT)
    message = (data or {}).get("customer_message")
    if not data or not message or message in used:
        # Fall back to plain text generation, then wrap.
        text = generate_text(
            f"You are a {persona} customer with a {scenario} issue about {product or 'your order'}. "
            f"Reply in 1-3 sentences to the support agent, without repeating any of these lines: "
            f"{previous[-4:] if previous else 'none'}. Agent said: \"{agent_reply}\""
        )
        fb = _fallback(persona, scenario, frustration, used)
        if text and text not in used:
            fb["customer_message"] = text
        return fb
    data.setdefault("frustration_level", round(frustration, 2))
    return data
