/**
 * Clario AI API client.
 *
 * Points to VITE_API_BASE_URL (your FastAPI backend). If unset, all calls
 * return realistic mock data so the app remains fully explorable.
 *
 * Endpoint contract (documented for the FastAPI side):
 *   POST /session/start        -> { session_id, config }
 *   GET  /session/latest       -> Session
 *   GET  /session/history      -> Session[]
 *   POST /chat                 -> { turn, analysis, coaching, knowledge, risk }
 *   POST /upload               -> { document_id, chunks }
 *   POST /knowledge/search     -> { chunks: RetrievedChunk[] }
 *   POST /knowledge/upload     -> { document_id, filename, chunks }
 *   DELETE /knowledge/:id      -> { ok }
 *   GET  /report/:sessionId    -> Report
 *   GET  /analytics            -> AnalyticsSummary
 *   GET  /settings             -> Settings
 *   PUT  /settings             -> Settings
 */

import {
  mockAnalytics,
  mockChatTurn,
  mockKnowledgeDocs,
  mockKnowledgeSearch,
  mockReport,
  mockSessions,
  mockSettings,
} from "./mock-data";
import type {
  AnalyticsSummary,
  ChatTurnResponse,
  KnowledgeDocument,
  Report,
  RetrievedChunk,
  Session,
  SessionConfig,
  Settings,
} from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
export const USING_MOCKS = !BASE_URL;

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  if (!BASE_URL) throw new Error("VITE_API_BASE_URL not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

// Small artificial delay for mocks so loading skeletons are visible.
const mock = <T>(value: T, ms = 350): Promise<T> =>
  new Promise((r) => setTimeout(() => r(value), ms));

export const api = {
  startSession(config: SessionConfig): Promise<Session> {
    if (USING_MOCKS) {
      return mock({
        id: `sess_${Math.random().toString(36).slice(2, 10)}`,
        config,
        started_at: new Date().toISOString(),
        status: "active",
        turn_count: 0,
        resolution_score: null,
      });
    }
    return req("/session/start", { method: "POST", body: JSON.stringify(config) });
  },

  latestSession(): Promise<Session | null> {
    if (USING_MOCKS) return mock(mockSessions[0] ?? null);
    return req("/session/latest");
  },

  sessionHistory(): Promise<Session[]> {
    if (USING_MOCKS) return mock(mockSessions);
    return req("/session/history");
  },

  chat(payload: {
    session_id: string;
    message: string;
    role: "customer" | "agent";
  }): Promise<ChatTurnResponse> {
    if (USING_MOCKS) return mock(mockChatTurn(payload), 700);
    return req("/chat", { method: "POST", body: JSON.stringify(payload) });
  },

  knowledgeSearch(query: string): Promise<{ chunks: RetrievedChunk[] }> {
    if (USING_MOCKS) return mock({ chunks: mockKnowledgeSearch(query) }, 400);
    return req("/knowledge/search", { method: "POST", body: JSON.stringify({ query }) });
  },

  knowledgeList(): Promise<KnowledgeDocument[]> {
    if (USING_MOCKS) return mock(mockKnowledgeDocs);
    return req("/knowledge");
  },

  knowledgeUpload(file: File): Promise<KnowledgeDocument> {
    if (USING_MOCKS)
      return mock({
        id: `doc_${Math.random().toString(36).slice(2, 8)}`,
        filename: file.name,
        size_bytes: file.size,
        chunks: Math.max(4, Math.floor(file.size / 2000)),
        uploaded_at: new Date().toISOString(),
        type: file.name.split(".").pop()?.toUpperCase() ?? "TXT",
      });
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE_URL}/knowledge/upload`, { method: "POST", body: fd }).then((r) => r.json());
  },

  knowledgeDelete(id: string): Promise<{ ok: true }> {
    if (USING_MOCKS) return mock({ ok: true });
    return req(`/knowledge/${id}`, { method: "DELETE" });
  },

  report(sessionId: string): Promise<Report> {
    if (USING_MOCKS) return mock(mockReport(sessionId));
    return req(`/report/${sessionId}`);
  },

  async reportPdf(sessionId: string, userName?: string): Promise<Blob> {
    if (USING_MOCKS) {
      // Simple text/plain fallback so download still works with mocks.
      return new Blob([`Clario AI report for session ${sessionId}\nUser: ${userName ?? "—"}\n`], {
        type: "text/plain",
      });
    }
    const qs = userName ? `?user=${encodeURIComponent(userName)}` : "";
    const res = await fetch(`${BASE_URL}/report/${sessionId}/pdf${qs}`);
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return await res.blob();
  },

  analytics(): Promise<AnalyticsSummary> {
    if (USING_MOCKS) return mock(mockAnalytics);
    return req("/analytics");
  },

  settings(): Promise<Settings> {
    if (USING_MOCKS) return mock(mockSettings);
    return req("/settings");
  },

  saveSettings(s: Settings): Promise<Settings> {
    if (USING_MOCKS) return mock(s);
    return req("/settings", { method: "PUT", body: JSON.stringify(s) });
  },

  // ----- Replay mode (backend: /replay/*) -----
  async replayUpload(file: File, sessionId?: string): Promise<ReplayTranscript> {
    if (USING_MOCKS) {
      const text = await file.text();
      const messages = parseTranscriptText(text);
      return {
        session_id: sessionId ?? `sess_replay_${Math.random().toString(36).slice(2, 8)}`,
        filename: file.name,
        total_messages: messages.length,
        messages,
      };
    }
    const fd = new FormData();
    fd.append("file", file);
    if (sessionId) fd.append("session_id", sessionId);
    const res = await fetch(`${BASE_URL}/replay/upload`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
    return (await res.json()) as ReplayTranscript;
  },

  replayTranscript(sessionId: string): Promise<ReplayTranscript> {
    return req(`/replay/${sessionId}`);
  },

  async replayStep(
    sessionId: string,
    index: number,
    fallbackMessage?: ReplayMessage,
  ): Promise<ReplayTurn> {
    if (USING_MOCKS) {
      const msg = fallbackMessage!;
      const turn = await mockChatTurn({
        session_id: sessionId,
        message: msg.content,
        role: msg.role === "agent" ? "agent" : "customer",
      });
      return {
        index: msg.index,
        role: msg.role,
        message: msg.content,
        analysis: turn.analysis,
        coaching: turn.coaching,
        knowledge: turn.knowledge,
        risk: turn.risk,
        agent_trace: turn.agent_trace,
      };
    }
    return req("/replay/step", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId, index }),
    });
  },
};

/**
 * Client-side transcript parsing, mirroring the backend parser in
 * backend/app/routes/replay.py. Only used when no API base URL is configured.
 */
export function parseTranscriptText(text: string): ReplayMessage[] {
  const customer = new Set(["customer", "user", "client", "caller", "them"]);
  const agent = new Set(["agent", "support", "rep", "representative", "assistant", "me", "you"]);
  const system = new Set(["system", "note"]);
  const re = /^\s*(?:\[[^\]]*\]\s*)?([A-Za-z ]{2,20}?)\s*[:>-]\s*(.+)$/;
  const out: ReplayMessage[] = [];
  let next: ReplayMessage["role"] = "customer";
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let role: ReplayMessage["role"] | null = null;
    let content = line;
    const m = re.exec(line);
    if (m) {
      const label = m[1].trim().toLowerCase();
      const body = m[2].trim();
      if (customer.has(label)) [role, content] = ["customer", body];
      else if (agent.has(label)) [role, content] = ["agent", body];
      else if (system.has(label)) [role, content] = ["system", body];
    }
    if (role === null) role = next;
    next = role === "customer" ? "agent" : "customer";
    if (content) out.push({ index: out.length, role, content });
  }
  return out;
}

