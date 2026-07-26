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
};
