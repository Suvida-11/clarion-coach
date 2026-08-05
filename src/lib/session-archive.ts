import type { ChatMessage, ChatTurnResponse, SessionConfig } from "./types";

/**
 * Per-session archive so Past Conversations can restore the transcript,
 * coaching, knowledge and escalation state after a reload or navigation.
 * Stored locally — no extra API calls.
 */
export interface SessionArchive {
  session_id: string;
  messages: ChatMessage[];
  turns: ChatTurnResponse[];
  config?: SessionConfig;
  updated_at: string;
}

const KEY = (sessionId: string) => `clario.session.${sessionId}`;

export function saveArchive(
  sessionId: string,
  messages: ChatMessage[],
  turns: ChatTurnResponse[],
  config?: SessionConfig,
): void {
  if (!messages.length && !turns.length) return;
  try {
    const archive: SessionArchive = {
      session_id: sessionId,
      messages,
      turns,
      config: config ?? readArchive(sessionId)?.config,
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(KEY(sessionId), JSON.stringify(archive));
  } catch {
    /* storage unavailable */
  }
}

export function readArchive(sessionId: string): SessionArchive | null {
  try {
    const raw = localStorage.getItem(KEY(sessionId));
    return raw ? (JSON.parse(raw) as SessionArchive) : null;
  } catch {
    return null;
  }
}

export function clearArchive(sessionId: string): void {
  try {
    localStorage.removeItem(KEY(sessionId));
  } catch {
    /* noop */
  }
}

/** Every archived session, newest first. */
export function listArchives(): SessionArchive[] {
  try {
    const out: SessionArchive[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith("clario.session.")) continue;
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as SessionArchive;
      if (parsed?.session_id) out.push(parsed);
    }
    return out.sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
  } catch {
    return [];
  }
}

/**
 * Archive for a session, falling back to the most recent archived session that
 * actually has messages. Prevents "No transcript captured" in reports when the
 * report is opened for a demo/session id that was never chatted in.
 */
export function readArchiveOrLatest(sessionId: string): SessionArchive | null {
  const exact = readArchive(sessionId);
  if (exact?.messages?.length) return exact;
  const withMessages = listArchives().find((a) => a.messages?.length);
  return withMessages ?? exact;
}
