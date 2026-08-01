from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field

Persona = Literal["Calm", "Angry", "Confused", "Technical", "Impatient", "VIP Customer"]
Mode = Literal["simulator", "manual", "replay"]
Difficulty = Literal["Easy", "Medium", "Hard", "Expert"]
Sentiment = Literal["positive", "neutral", "negative", "very_negative"]
RiskLevel = Literal["low", "medium", "high", "critical"]
ChunkType = Literal["FAQ", "Article", "Policy", "Troubleshooting"]


class SessionConfig(BaseModel):
    mode: Mode
    persona: Persona
    scenario: str
    product: str
    difficulty: Difficulty
    language: str


class Session(BaseModel):
    id: str
    config: SessionConfig
    started_at: str
    status: Literal["active", "completed"] = "active"
    turn_count: int = 0
    resolution_score: Optional[float] = None


class ChatMessage(BaseModel):
    id: str
    role: Literal["customer", "agent", "system"]
    content: str
    timestamp: str


class IntentAnalysis(BaseModel):
    intent: str
    sentiment: Sentiment
    sentiment_score: float = 0.0
    frustration: float = 0.0
    urgency: float = 0.0
    confidence: float = 0.0
    satisfaction_trend: Literal["improving", "steady", "declining"] = "steady"


class CoachingScores(BaseModel):
    tone: float = 0.0
    clarity: float = 0.0
    grammar: float = 0.0
    professionalism: float = 0.0
    empathy: float = 0.0


class CoachingSuggestion(BaseModel):
    suggested_response: str
    tone_notes: list[str] = Field(default_factory=list)
    clarity_notes: list[str] = Field(default_factory=list)
    grammar_notes: list[str] = Field(default_factory=list)
    empathy_notes: list[str] = Field(default_factory=list)
    professional_notes: list[str] = Field(default_factory=list)
    improvement_tips: list[str] = Field(default_factory=list)
    scores: CoachingScores = Field(default_factory=CoachingScores)
    coaching_score: float = 0.0
    score_reasoning: str = ""


class RetrievedChunk(BaseModel):
    id: str
    source: str
    title: str
    preview: str
    similarity: float
    type: ChunkType = "Article"


class EscalationRisk(BaseModel):
    probability: float
    level: RiskLevel
    reasoning: str
    recommended_action: str
    repeated_complaints: int = 0
    resolution_status: Literal["unresolved", "in_progress", "resolved"] = "unresolved"
    signals: list[str] = Field(default_factory=list)


class ChatRequest(BaseModel):
    session_id: str
    message: str
    role: Literal["customer", "agent"]


class AgentTraceEntry(BaseModel):
    agent: str
    status: Literal["Completed", "Running", "Failed", "Skipped"] = "Completed"
    execution_time: str = "0 ms"
    summary: str = ""
    timestamp: str = ""
    started_at: str = ""
    ended_at: str = ""
    execution_ms: int = 0
    details: dict = Field(default_factory=dict)



class ChatTurnResponse(BaseModel):
    turn: ChatMessage
    simulated_customer_reply: Optional[ChatMessage] = None
    analysis: IntentAnalysis
    coaching: CoachingSuggestion
    knowledge: list[RetrievedChunk] = Field(default_factory=list)
    risk: EscalationRisk
    # Extended contract (additive; existing frontend ignores unknown fields)
    customer_message: Optional[str] = None
    intent_analysis: Optional[IntentAnalysis] = None
    knowledge_recommendations: list[dict] = Field(default_factory=list)
    risk_level: Optional[str] = None
    conversation_summary: Optional[str] = None
    agent_trace: list[AgentTraceEntry] = Field(default_factory=list)


class KnowledgeDocument(BaseModel):
    id: str
    filename: str
    size_bytes: int
    chunks: int
    uploaded_at: str
    type: str


class KnowledgeSearchRequest(BaseModel):
    query: str
    k: int = 5


class KnowledgeSearchResponse(BaseModel):
    chunks: list[RetrievedChunk]


class Report(BaseModel):
    session_id: str
    summary: str
    resolution_score: float
    sentiment_timeline: list[dict]
    intent_progression: list[str]
    escalation_events: list[dict]
    knowledge_used: list[RetrievedChunk]
    strengths: list[str]
    weaknesses: list[str]
    improvements: list[str]
    recommendations: list[str]


class AnalyticsSummary(BaseModel):
    total_sessions: int
    avg_sentiment: float
    avg_resolution: float
    escalations: int
    csat: float
    sentiment_series: list[dict]
    escalation_series: list[dict]
    resolution_series: list[dict]
    intent_breakdown: list[dict]
    knowledge_usage: list[dict]
    duration_series: list[dict]


class NotificationSettings(BaseModel):
    escalation_alerts: bool = True
    session_summaries: bool = True
    weekly_digest: bool = False


class Settings(BaseModel):
    gemini_api_key_masked: str
    theme: Literal["dark", "light", "system"] = "dark"
    language: str = "English"
    notifications: NotificationSettings = NotificationSettings()
