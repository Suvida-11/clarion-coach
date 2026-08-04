import type { ChatMessage, ChatTurnResponse } from "./types";

/**
 * Per-session archive so Past Conversations can restore the transcript,
 * coaching, knowledge and escalation state after a reload or navigation.
 * Stored locally — no extra API calls.
 */
export interface SessionArchive {
  session_id: string;
  messages: ChatMessage[];
  turns: ChatTurnResponse[];
  updated_at: string;
}

const KEY = (sessionId: string) => `clario.session.${sessionId}`;

export function saveArchive(
  sessionId: string,
  messages: ChatMessage[],
  turns: ChatTurnResponse[],
): void {
  if (!messages.length && !turns.length) return;
  try {
    const archive: SessionArchive = {
      session_id: sessionId,
      messages,
      turns,
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
