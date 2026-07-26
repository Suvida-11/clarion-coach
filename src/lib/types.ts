export type Persona =
  | "Calm"
  | "Angry"
  | "Confused"
  | "Technical"
  | "Impatient"
  | "VIP Customer"
  | "Beginner"
  | "Technical User"
  | "Frustrated"
  | "Polite";
export type Mode = "simulator" | "manual" | "replay";
export type Difficulty = "Easy" | "Medium" | "Hard" | "Expert";

export interface SessionConfig {
  mode: Mode;
  persona: Persona;
  scenario: string;
  product: string;
  difficulty: Difficulty;
  language: string;
}

export interface Session {
  id: string;
  config: SessionConfig;
  started_at: string;
  status: "active" | "completed";
  turn_count: number;
  resolution_score: number | null;
}

export interface ChatMessage {
  id: string;
  role: "customer" | "agent" | "system";
  content: string;
  timestamp: string;
}

export interface IntentAnalysis {
  intent: string;
  sentiment: "positive" | "neutral" | "negative" | "very_negative";
  sentiment_score: number; // -1..1
  frustration: number; // 0..1
  urgency: number; // 0..1
  confidence: number; // 0..1
  satisfaction_trend: "improving" | "steady" | "declining";
}

export interface CoachingSuggestion {
  suggested_response: string;
  tone_notes: string[];
  grammar_notes: string[];
  empathy_notes: string[];
  professional_notes: string[];
}

export interface RetrievedChunk {
  id: string;
  source: string;
  title: string;
  preview: string;
  similarity: number;
  type: "FAQ" | "Article" | "Policy" | "Troubleshooting";
}

export interface EscalationRisk {
  probability: number; // 0..1
  level: "low" | "medium" | "high" | "critical";
  reasoning: string;
  recommended_action: string;
}

export interface AgentTraceEntry {
  agent: string;
  status: "Completed" | "Running" | "Failed" | "Skipped";
  execution_time: string;
  summary: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

export interface ChatTurnResponse {
  turn: ChatMessage;
  simulated_customer_reply?: ChatMessage;
  analysis: IntentAnalysis;
  coaching: CoachingSuggestion;
  knowledge: RetrievedChunk[];
  risk: EscalationRisk;
  agent_trace?: AgentTraceEntry[];
}

export interface KnowledgeDocument {
  id: string;
  filename: string;
  size_bytes: number;
  chunks: number;
  uploaded_at: string;
  type: string;
}

export interface Report {
  session_id: string;
  summary: string;
  resolution_score: number;
  sentiment_timeline: { turn: number; score: number }[];
  intent_progression: string[];
  escalation_events: { turn: number; level: string; reason: string }[];
  knowledge_used: RetrievedChunk[];
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  recommendations: string[];
}

export interface AnalyticsSummary {
  total_sessions: number;
  avg_sentiment: number;
  avg_resolution: number;
  escalations: number;
  csat: number;
  sentiment_series: { date: string; sentiment: number }[];
  escalation_series: { date: string; escalations: number }[];
  resolution_series: { date: string; score: number }[];
  intent_breakdown: { intent: string; count: number }[];
  knowledge_usage: { source: string; uses: number }[];
  duration_series: { date: string; minutes: number }[];
}

export interface Settings {
  gemini_api_key_masked: string;
  theme: "dark" | "light" | "system";
  language: string;
  notifications: {
    escalation_alerts: boolean;
    session_summaries: boolean;
    weekly_digest: boolean;
  };
}
