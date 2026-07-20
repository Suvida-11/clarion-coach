"""Intent Detection Agent — classifies customer intent + sentiment via Gemini."""
from __future__ import annotations
from ..schemas.chat import IntentAnalysis
from ..services.gemini_service import generate_json

INTENTS = [
    "Refund Request",
    "Payment Issue",
    "Technical Support",
    "General Inquiry",
    "Complaint",
    "Order Status",
]

SYSTEM = """You are an Intent Detection agent for a customer support platform.
Classify the customer's message and return ONLY strict JSON with keys:
{
  "intent": one of ["Refund Request","Payment Issue","Technical Support","General Inquiry","Complaint","Order Status"],
  "sentiment": one of ["positive","neutral","negative","very_negative"],
  "sentiment_score": number in [-1,1],
  "frustration": number in [0,1],
  "urgency": number in [0,1],
  "confidence": number in [0,1],
  "satisfaction_trend": one of ["improving","steady","declining"]
}
No prose. No markdown. JSON only."""


def _fallback(message: str) -> IntentAnalysis:
    msg = message.lower()
    if any(w in msg for w in ["refund", "money back", "chargeback"]):
        intent = "Refund Request"
    elif any(w in msg for w in ["pay", "charge", "invoice", "billing"]):
        intent = "Payment Issue"
    elif any(w in msg for w in ["error", "bug", "not working", "crash", "broken"]):
        intent = "Technical Support"
    elif any(w in msg for w in ["order", "shipping", "delivery", "tracking"]):
        intent = "Order Status"
    elif any(w in msg for w in ["angry", "terrible", "worst", "hate", "unacceptable"]):
        intent = "Complaint"
    else:
        intent = "General Inquiry"
    neg = any(w in msg for w in ["angry", "terrible", "worst", "hate", "!!", "unacceptable", "furious"])
    sentiment = "very_negative" if neg else "neutral"
    return IntentAnalysis(
        intent=intent,
        sentiment=sentiment,
        sentiment_score=-0.6 if neg else 0.0,
        frustration=0.7 if neg else 0.2,
        urgency=0.6 if neg else 0.3,
        confidence=0.55,
        satisfaction_trend="declining" if neg else "steady",
    )


def analyze_intent(message: str) -> IntentAnalysis:
    data = generate_json(f'Customer message: """{message}"""', system=SYSTEM)
    if not data:
        return _fallback(message)
    try:
        if data.get("intent") not in INTENTS:
            data["intent"] = "General Inquiry"
        return IntentAnalysis(**data)
    except Exception:
        return _fallback(message)
