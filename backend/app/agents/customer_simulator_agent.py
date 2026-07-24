"""Customer Simulator Agent.

Generates realistic customer replies during Simulator Mode. Uses the
centralized Gemini service and pulls its system prompt from
`app.prompts.system_prompts`.
"""
from __future__ import annotations

from typing import Any, Iterable

from ..prompts.system_prompts import CUSTOMER_SIMULATOR_SYSTEM_PROMPT
from ..services.gemini_service import generate_json, generate_text

SCENARIOS = {
    "Refund Request", "Technical Support", "Payment Failure",
    "Product Inquiry", "Delivery Delay", "Complaint",
}
PERSONAS = {"Calm", "Angry", "Frustrated", "Confused", "Friendly"}


def _fallback(persona: str, scenario: str, agent_reply: str) -> dict[str, Any]:
    frustration = 0.8 if persona in {"Angry", "Frustrated"} else 0.3
    return {
        "customer_message": (
            "That's not really solving my problem. Can you actually help me here?"
            if frustration > 0.5
            else "Okay, could you walk me through the next step?"
        ),
        "emotion": persona.lower(),
        "frustration_level": frustration,
        "conversation_stage": "clarifying",
        "next_expected_intent": scenario or "General Inquiry",
    }


def simulate_customer(
    persona: str | None,
    scenario: str | None,
    agent_reply: str,
    history: Iterable[dict[str, str]] | None = None,
    emotion_level: float | None = None,
) -> dict[str, Any]:
    """Return the next customer turn as a structured dict."""
    persona = persona if persona in PERSONAS else "Angry"
    scenario = scenario if scenario in SCENARIOS else "Complaint"
    hist_txt = ""
    if history:
        hist_txt = "\n".join(f"{m.get('role')}: {m.get('content')}" for m in history)

    prompt = (
        f"Scenario: {scenario}\n"
        f"Persona: {persona}\n"
        f"Emotion level (0-1): {emotion_level if emotion_level is not None else 'auto'}\n"
        f"Conversation so far:\n{hist_txt or '(none)'}\n\n"
        f'Agent just said: "{agent_reply}"\n\n'
        "Produce the customer's next reply as JSON per the schema."
    )
    data = generate_json(prompt, system=CUSTOMER_SIMULATOR_SYSTEM_PROMPT)
    if not data or not data.get("customer_message"):
        # Fall back to plain text generation, then wrap.
        text = generate_text(
            f"As a {persona} customer in scenario '{scenario}', reply in 1-3 sentences to: \"{agent_reply}\""
        )
        fb = _fallback(persona, scenario, agent_reply)
        if text:
            fb["customer_message"] = text
        return fb
    return data
