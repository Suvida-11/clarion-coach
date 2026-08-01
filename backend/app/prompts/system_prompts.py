"""Centralized system prompt access for all Clarion Coach AI agents.

Prompt BODIES are NOT stored here — they live in external markdown files under
`backend/prompts/`. This module only resolves them via `loader.load_prompt`, so
prompts can be edited and versioned without touching Python code.

Files:
- prompts/customer_simulator_system_prompt.md
- prompts/intent_agent_system_prompt.md
- prompts/knowledge_recommendation_system_prompt.md
- prompts/coaching_agent_system_prompt.md
- prompts/escalation_monitor_system_prompt.md
"""
from __future__ import annotations

from .loader import load_prompt, prompt_version

INTENT_PROMPT_FILE = "intent_agent_system_prompt"
COACHING_PROMPT_FILE = "coaching_agent_system_prompt"
CUSTOMER_SIMULATOR_PROMPT_FILE = "customer_simulator_system_prompt"
KNOWLEDGE_PROMPT_FILE = "knowledge_recommendation_system_prompt"
ESCALATION_PROMPT_FILE = "escalation_monitor_system_prompt"

_MINIMAL_JSON_RULE = "Respond with a single strict JSON object. No markdown, no commentary."

INTENT_AGENT_SYSTEM_PROMPT = load_prompt(
    INTENT_PROMPT_FILE,
    fallback=(
        "You are the Intent Detection agent. Classify the customer's message "
        'into one of ["Refund Request","Payment Issue","Technical Support",'
        '"General Inquiry","Complaint","Order Status"] and estimate sentiment, '
        "sentiment_score, frustration, urgency, confidence and "
        "satisfaction_trend. " + _MINIMAL_JSON_RULE
    ),
)

COACHING_AGENT_SYSTEM_PROMPT = load_prompt(
    COACHING_PROMPT_FILE,
    fallback=(
        "You are an expert Customer Support Coaching agent. Return "
        "suggested_response, tone_notes, clarity_notes, grammar_notes, "
        "empathy_notes, professional_notes, improvement_tips, scores "
        "{tone,clarity,grammar,professionalism,empathy} each 0-100, "
        "coaching_score 0-100 and score_reasoning. " + _MINIMAL_JSON_RULE
    ),
)

CUSTOMER_SIMULATOR_SYSTEM_PROMPT = load_prompt(
    CUSTOMER_SIMULATOR_PROMPT_FILE,
    fallback=(
        "You role-play a realistic customer talking to a support agent. Return "
        "customer_message, emotion, frustration_level, conversation_stage and "
        "next_expected_intent. Stay in character. " + _MINIMAL_JSON_RULE
    ),
)

KNOWLEDGE_RECOMMENDATION_SYSTEM_PROMPT = load_prompt(
    KNOWLEDGE_PROMPT_FILE,
    fallback=(
        "You are the Knowledge Recommendation agent. Return {\"documents\": "
        "[{title, chunk, similarity_score, why_relevant}]} for the top K "
        "retrieved chunks. Never fabricate documents. " + _MINIMAL_JSON_RULE
    ),
)

ESCALATION_MONITOR_SYSTEM_PROMPT = load_prompt(
    ESCALATION_PROMPT_FILE,
    fallback=(
        "You are the Escalation Risk Monitor agent. Given sentiment, "
        "frustration, urgency, conversation trajectory, repeated complaints and "
        "resolution status, return probability, level, reasoning, "
        "recommended_action, repeated_complaints, resolution_status and "
        "signals. " + _MINIMAL_JSON_RULE
    ),
)

ORCHESTRATOR_SYSTEM_PROMPT = """Role: Orchestrator coordinating the Clarion Coach
agent pipeline: Customer Simulator, Intent & Sentiment, Knowledge
Recommendation, Coaching and Escalation Risk Monitor.

Simulator mode: Customer Simulator -> Intent -> Knowledge -> Coaching -> Escalation.
Manual mode:    Intent -> Knowledge -> Coaching -> Escalation.
Replay mode:    For each transcript message: Intent -> Knowledge -> Coaching -> Escalation.

Note: This is a specification for the Python orchestrator; it is not sent to the
model. Orchestration remains code-based."""


def prompt_versions() -> dict[str, str]:
    """Version marker for every external prompt file (exposed via /settings)."""
    return {
        "customer_simulator": prompt_version(CUSTOMER_SIMULATOR_PROMPT_FILE),
        "intent": prompt_version(INTENT_PROMPT_FILE),
        "knowledge_recommendation": prompt_version(KNOWLEDGE_PROMPT_FILE),
        "coaching": prompt_version(COACHING_PROMPT_FILE),
        "escalation_monitor": prompt_version(ESCALATION_PROMPT_FILE),
    }
