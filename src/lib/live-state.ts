import { useEffect, useState } from "react";
import type { ChatTurnResponse } from "./types";

/**
 * Snapshot of the most recent analysed turn, written by the Console / Manual /
 * Replay workspaces and read by the Dashboard so its live cards show real
 * backend output instead of placeholders.
 */
export interface LiveSnapshot {
  session_id: string;
  mode: "simulator" | "manual" | "replay";
  intent: string;
  secondary_intent?: string;
  sentiment: string;
  sentiment_score: number;
  frustration: number;
  coaching_score: number;
  risk_level: string;
  risk_probability: number;
  knowledge_count: number;
  updated_at: string;
}

const KEY = "clario.live-snapshot";
const EVENT = "clario:live-snapshot";

export function recordSnapshot(
  sessionId: string,
  mode: LiveSnapshot["mode"],
  turn: ChatTurnResponse,
): void {
  const raw = turn.coaching?.coaching_score ?? 0;
  const snap: LiveSnapshot = {
    session_id: sessionId,
    mode,
    intent: turn.analysis?.intent ?? "—",
    secondary_intent: turn.analysis?.secondary_intent,
    sentiment: turn.analysis?.sentiment ?? "neutral",
    sentiment_score: turn.analysis?.sentiment_score ?? 0,
    frustration: turn.analysis?.frustration ?? 0,
    coaching_score: raw <= 1 ? raw * 100 : raw,
    risk_level: turn.risk?.level ?? "low",
    risk_probability: turn.risk?.probability ?? 0,
    knowledge_count: turn.knowledge?.length ?? 0,
    updated_at: new Date().toISOString(),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(snap));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage unavailable */
  }
}

export function readSnapshot(): LiveSnapshot | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as LiveSnapshot) : null;
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* noop */
  }
}

/** Hydration-safe hook returning the latest live snapshot. */
export function useLiveSnapshot(): LiveSnapshot | null {
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  useEffect(() => {
    const sync = () => setSnap(readSnapshot());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return snap;
}
