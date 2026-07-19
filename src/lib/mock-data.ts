import type {
  AnalyticsSummary,
  ChatTurnResponse,
  KnowledgeDocument,
  Report,
  RetrievedChunk,
  Session,
  Settings,
} from "./types";

export const mockSessions: Session[] = [
  {
    id: "sess_a91k2",
    config: {
      mode: "simulator",
      persona: "Angry",
      scenario: "Refund dispute — order arrived damaged",
      product: "Orbit Wireless Earbuds",
      difficulty: "Hard",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    status: "active",
    turn_count: 8,
    resolution_score: null,
  },
  {
    id: "sess_88f0x",
    config: {
      mode: "manual",
      persona: "Technical",
      scenario: "API rate limits and 429 responses",
      product: "Clario Developer Platform",
      difficulty: "Expert",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    status: "completed",
    turn_count: 14,
    resolution_score: 87,
  },
  {
    id: "sess_770cd",
    config: {
      mode: "simulator",
      persona: "Confused",
      scenario: "Cannot reset account password",
      product: "Clario Web App",
      difficulty: "Easy",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    status: "completed",
    turn_count: 6,
    resolution_score: 92,
  },
  {
    id: "sess_5511a",
    config: {
      mode: "replay",
      persona: "VIP Customer",
      scenario: "Enterprise contract renewal complaint",
      product: "Clario Enterprise",
      difficulty: "Expert",
      language: "English",
    },
    started_at: new Date(Date.now() - 1000 * 60 * 60 * 40).toISOString(),
    status: "completed",
    turn_count: 22,
    resolution_score: 74,
  },
];

const chunks: RetrievedChunk[] = [
  {
    id: "kb_refund_01",
    source: "policies/refund-policy-v3.pdf",
    title: "Damaged Item Refund Policy",
    preview:
      "Customers reporting damaged goods within 30 days of delivery are eligible for a full refund or free replacement. Photo evidence is required for orders above $50.",
    similarity: 0.912,
    type: "Policy",
  },
  {
    id: "kb_shipping_04",
    source: "faqs/shipping.md",
    title: "How do I report a damaged shipment?",
    preview:
      "Ask the customer to submit photos through the returns portal. Issue a return label within 24h and escalate to logistics if the carrier is at fault.",
    similarity: 0.874,
    type: "FAQ",
  },
  {
    id: "kb_earbuds_02",
    source: "products/orbit-earbuds.docx",
    title: "Orbit Earbuds — QA and warranty",
    preview:
      "All Orbit units include a 12-month warranty. Battery, driver, or hinge defects qualify for immediate replacement without RMA fees.",
    similarity: 0.802,
    type: "Article",
  },
  {
    id: "kb_tone_03",
    source: "training/de-escalation.pdf",
    title: "De-escalation phrases for high-frustration customers",
    preview:
      "Lead with acknowledgment: 'I completely understand how frustrating that must be.' Follow with a concrete next step within one sentence.",
    similarity: 0.771,
    type: "Troubleshooting",
  },
];

export const mockKnowledgeSearch = (_query: string): RetrievedChunk[] => chunks;

export const mockKnowledgeDocs: KnowledgeDocument[] = [
  {
    id: "doc_refund",
    filename: "refund-policy-v3.pdf",
    size_bytes: 184_223,
    chunks: 48,
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
    type: "PDF",
  },
  {
    id: "doc_shipping",
    filename: "shipping-faqs.md",
    size_bytes: 22_110,
    chunks: 12,
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    type: "MD",
  },
  {
    id: "doc_orbit",
    filename: "orbit-earbuds-manual.docx",
    size_bytes: 341_002,
    chunks: 74,
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    type: "DOCX",
  },
  {
    id: "doc_deesc",
    filename: "de-escalation-playbook.pdf",
    size_bytes: 96_540,
    chunks: 24,
    uploaded_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    type: "PDF",
  },
];

const CUSTOMER_LINES = [
  "This is absolutely ridiculous. My order came in broken and no one is responding!",
  "I've been waiting three days for someone to acknowledge my refund request.",
  "Okay, I sent the photos. What happens now? I need this resolved today.",
  "I don't want a replacement — I want my money back and an apology.",
  "Fine. If you process the refund now I'll consider staying a customer.",
];

const AGENT_LINES = [
  "I'm really sorry you're going through this. I can see the order right here — let me take care of the refund now.",
  "Absolutely, I'll fast-track this. You'll see the refund back on your card within 3 business days.",
];

let turnIdx = 0;

export function mockChatTurn(payload: {
  session_id: string;
  message: string;
  role: "customer" | "agent";
}): ChatTurnResponse {
  const now = new Date().toISOString();
  const isCustomer = payload.role === "customer";
  turnIdx += 1;

  const simulatedCustomer =
    !isCustomer && Math.random() > 0.2
      ? {
          id: `m_${Math.random().toString(36).slice(2, 8)}`,
          role: "customer" as const,
          content: CUSTOMER_LINES[turnIdx % CUSTOMER_LINES.length],
          timestamp: new Date(Date.now() + 800).toISOString(),
        }
      : undefined;

  const frustration = Math.max(0.15, Math.min(0.95, 0.7 - turnIdx * 0.05 + Math.random() * 0.1));
  const sentimentScore = -0.4 + turnIdx * 0.08 + (Math.random() - 0.5) * 0.1;

  return {
    turn: {
      id: `m_${Math.random().toString(36).slice(2, 8)}`,
      role: payload.role,
      content: payload.message,
      timestamp: now,
    },
    simulated_customer_reply: simulatedCustomer,
    analysis: {
      intent: isCustomer ? "Refund request — damaged goods" : "De-escalation & resolution offer",
      sentiment:
        sentimentScore < -0.3
          ? "very_negative"
          : sentimentScore < 0
            ? "negative"
            : sentimentScore < 0.3
              ? "neutral"
              : "positive",
      sentiment_score: Number(sentimentScore.toFixed(2)),
      frustration: Number(frustration.toFixed(2)),
      urgency: Number(Math.min(0.95, 0.6 + Math.random() * 0.3).toFixed(2)),
      confidence: 0.86,
      satisfaction_trend: turnIdx > 3 ? "improving" : "declining",
    },
    coaching: {
      suggested_response: AGENT_LINES[turnIdx % AGENT_LINES.length],
      tone_notes: [
        "Lead with empathy before offering the solution.",
        "Avoid conditional language like 'we might' — customer wants certainty.",
      ],
      grammar_notes: ["Consider tightening the second sentence for clarity."],
      empathy_notes: [
        "Acknowledge the delay explicitly: 'three days is far too long to wait'.",
      ],
      professional_notes: [
        "Include the refund reference number so the customer can track it.",
      ],
    },
    knowledge: chunks,
    risk: {
      probability: Number(Math.max(0.1, 0.85 - turnIdx * 0.08).toFixed(2)),
      level: turnIdx < 2 ? "high" : turnIdx < 4 ? "medium" : "low",
      reasoning:
        "Customer has escalated tone twice, mentioned 'ridiculous', and referenced churn ('staying a customer'). Frustration trend is high but improving after acknowledgment.",
      recommended_action:
        "Offer immediate refund + $10 goodwill credit. Loop in a supervisor if refund fails to process in-session.",
    },
  };
}

export function mockReport(session_id: string): Report {
  return {
    session_id,
    summary:
      "Customer contacted support after receiving damaged Orbit Earbuds. Initial exchanges were highly negative, with escalation risk peaking at 85% in turn 2. Agent acknowledged the delay, offered a full refund, and issued a goodwill credit. Session ended with the customer expressing satisfaction and confirming they would stay.",
    resolution_score: 87,
    sentiment_timeline: [
      { turn: 1, score: -0.6 },
      { turn: 2, score: -0.55 },
      { turn: 3, score: -0.3 },
      { turn: 4, score: -0.05 },
      { turn: 5, score: 0.2 },
      { turn: 6, score: 0.45 },
      { turn: 7, score: 0.6 },
    ],
    intent_progression: [
      "Refund request",
      "Frustration expression",
      "Delay complaint",
      "Refund confirmation request",
      "Goodwill acceptance",
    ],
    escalation_events: [
      { turn: 2, level: "high", reason: "Repeated frustration, mention of churn." },
      { turn: 4, level: "medium", reason: "Tone softened but urgency remained." },
    ],
    knowledge_used: chunks.slice(0, 3),
    strengths: [
      "Strong empathetic opener in turn 3.",
      "Concrete timelines given (3 business days).",
      "Proactive goodwill credit offer prevented escalation.",
    ],
    weaknesses: [
      "First response was slightly generic — missed the specific product context.",
      "Refund reference number was not shared until prompted.",
    ],
    improvements: [
      "Pull order context into the opening acknowledgment.",
      "Always share tracking IDs proactively.",
    ],
    recommendations: [
      "Review de-escalation playbook chapter 2 (acknowledgment templates).",
      "Enable auto-suggested refund reference numbers in the console.",
    ],
  };
}

const days = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d.toISOString().slice(5, 10);
  });

export const mockAnalytics: AnalyticsSummary = {
  total_sessions: 1247,
  avg_sentiment: 0.42,
  avg_resolution: 84,
  escalations: 38,
  csat: 4.6,
  sentiment_series: days(14).map((date, i) => ({
    date,
    sentiment: 0.2 + Math.sin(i / 2) * 0.15 + i * 0.015,
  })),
  escalation_series: days(14).map((date, i) => ({
    date,
    escalations: Math.max(0, 8 - Math.floor(i / 2) + Math.floor(Math.random() * 3)),
  })),
  resolution_series: days(14).map((date, i) => ({
    date,
    score: 70 + i * 1.1 + Math.random() * 6,
  })),
  intent_breakdown: [
    { intent: "Refund", count: 312 },
    { intent: "Technical", count: 268 },
    { intent: "Billing", count: 199 },
    { intent: "Account", count: 154 },
    { intent: "Shipping", count: 131 },
    { intent: "Other", count: 183 },
  ],
  knowledge_usage: [
    { source: "Refund Policy", uses: 421 },
    { source: "Shipping FAQs", uses: 318 },
    { source: "Product Manuals", uses: 264 },
    { source: "De-escalation", uses: 208 },
    { source: "Billing", uses: 141 },
  ],
  duration_series: days(14).map((date, i) => ({ date, minutes: 8 + Math.sin(i) * 2 + i * 0.1 })),
};

export const mockSettings: Settings = {
  gemini_api_key_masked: "••••••••••••7f2a",
  theme: "dark",
  language: "English",
  notifications: {
    escalation_alerts: true,
    session_summaries: true,
    weekly_digest: false,
  },
};
