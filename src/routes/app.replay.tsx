import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ReplayMessage, ReplayTranscript, ReplayTurn } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Upload,
  Gauge,
  FileText,
  Brain,
  BookOpen,
  ShieldAlert,
  Sparkles,
  Workflow,
  Loader2,
  User,
  Bot,
} from "lucide-react";
import { CoachingFeed } from "@/components/CoachingFeed";
import { KnowledgePanel } from "@/components/KnowledgePanel";
import { EscalationPanel, EscalationBanner } from "@/components/EscalationPanel";
import { AgentTraceTimeline } from "@/components/AgentTraceTimeline";
import {
  IntentAnalysisPanel,
  deriveEmotionFromAnalysis,
  type EmotionPoint,
} from "@/components/IntentAnalysisPanel";
import { recordSnapshot } from "@/lib/live-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/replay")({
  head: () => ({
    meta: [
      { title: "Replay Mode — Clarion Coach" },
      {
        name: "description",
        content:
          "Upload a past support transcript and replay it turn by turn while Clarion Coach analyses intent, sentiment, knowledge, coaching and escalation risk.",
      },
      { property: "og:title", content: "Replay Mode — Clarion Coach" },
      {
        property: "og:description",
        content: "Step through a real transcript and watch the AI coaching pipeline react live.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReplayMode,
});

const SAMPLE = `Customer: I ordered the Orbit earbuds nine days ago and the tracking hasn't moved since Tuesday.
Agent: I'm sorry about that — let me check the carrier scan history for order ORB-48213 right now.
Customer: This is the second time a delivery from you has gone missing. I need it before Friday.
Agent: Understood. The parcel is stuck at the Leeds hub. I've raised a replacement shipped overnight, reference RS-9921.
Customer: Okay, that helps. Will I get a tracking number tonight?
Agent: Yes — you'll get the tracking email within two hours, and I'll follow up personally tomorrow morning.`;

type RightTab = "knowledge" | "escalation" | "trace";

function ReplayMode() {
  const [transcript, setTranscript] = useState<ReplayTranscript | null>(null);
  const [cursor, setCursor] = useState(-1); // last analysed index
  const [turns, setTurns] = useState<ReplayTurn[]>([]);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<RightTab>("knowledge");
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const messages = transcript?.messages ?? [];
  const latest = turns[turns.length - 1] ?? null;
  const done = !!transcript && cursor >= messages.length - 1;

  const emotionTimeline: EmotionPoint[] = useMemo(
    () =>
      turns
        .filter((t) => t.analysis)
        .map((t, i) => ({
          turn: i + 1,
          emotion: deriveEmotionFromAnalysis(t.analysis!),
          value: Math.round(t.analysis!.sentiment_score * 2),
        })),
    [turns],
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns.length]);

  async function load(file: File) {
    setBusy(true);
    try {
      const data = await api.replayUpload(file);
      setTranscript(data);
      setTurns([]);
      setCursor(-1);
      setPlaying(false);
      toast.success(`Loaded ${data.total_messages} messages from ${data.filename}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  function loadSample() {
    const file = new File([SAMPLE], "sample-transcript.txt", { type: "text/plain" });
    void load(file);
  }

  const step = useCallback(
    async (index: number) => {
      if (!transcript || index < 0 || index >= transcript.messages.length) return;
      const msg = transcript.messages[index];
      setBusy(true);
      try {
        const turn = await api.replayStep(transcript.session_id, index, msg);
        setTurns((t) => [...t.filter((x) => x.index !== index), turn].sort((a, b) => a.index - b.index));
        setCursor(index);
        recordSnapshot(transcript.session_id, "replay", {
          turn: {
            id: `replay_${index}`,
            role: msg.role,
            content: msg.content,
            timestamp: new Date().toISOString(),
          },
          analysis: turn.analysis!,
          coaching: turn.coaching!,
          knowledge: turn.knowledge,
          risk: turn.risk!,
          agent_trace: turn.agent_trace,
        });
      } catch (e) {
        setPlaying(false);
        toast.error(e instanceof Error ? e.message : "Replay step failed");
      } finally {
        setBusy(false);
      }
    },
    [transcript],
  );

  // Autoplay loop
  useEffect(() => {
    if (!playing || !transcript) return;
    if (cursor >= transcript.messages.length - 1) {
      setPlaying(false);
      return;
    }
    const id = setTimeout(() => void step(cursor + 1), 1400 / speed);
    return () => clearTimeout(id);
  }, [playing, cursor, transcript, speed, step]);

  function restart() {
    setTurns([]);
    setCursor(-1);
    setPlaying(false);
  }

  const analysed = messages.slice(0, cursor + 1);

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Replay mode</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Upload a past conversation and replay it one message at a time. Every step runs the full
            pipeline — Intent &amp; Sentiment, Knowledge Recommendation, Coaching and Escalation
            Monitor — so you can watch the analysis evolve like a live session.
          </p>
        </div>
        {transcript && (
          <Badge variant="outline" className="font-mono text-xs">
            {transcript.session_id}
          </Badge>
        )}
      </header>

      {latest?.risk && <EscalationBanner risk={latest.risk} />}

      {/* Upload + controls */}
      <section className="surface rounded-2xl p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.log"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void load(f);
              e.target.value = "";
            }}
          />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="mr-1.5 h-4 w-4" />
            Upload transcript
          </Button>
          <Button variant="outline" onClick={loadSample} disabled={busy}>
            <FileText className="mr-1.5 h-4 w-4" />
            Use sample
          </Button>
          {transcript && (
            <span className="text-xs text-muted-foreground">
              {transcript.filename} · {transcript.total_messages} messages
            </span>
          )}
        </div>

        {transcript && (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={() => setPlaying((p) => !p)}
                disabled={busy || done}
                className="bg-brand text-primary-foreground hover:opacity-90"
              >
                {playing ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                {playing ? "Pause" : "Play"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPlaying(false);
                  setCursor((c) => Math.max(-1, c - 1));
                  setTurns((t) => t.filter((x) => x.index < cursor));
                }}
                disabled={cursor < 0 || busy}
              >
                <SkipBack className="mr-1.5 h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setPlaying(false);
                  void step(cursor + 1);
                }}
                disabled={done || busy}
              >
                <SkipForward className="mr-1.5 h-3.5 w-3.5" />
                Next
              </Button>
              <Button size="sm" variant="outline" onClick={restart} disabled={busy}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Restart
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
                title="Playback speed"
              >
                <Gauge className="mr-1.5 h-3.5 w-3.5" />
                {speed}x
              </Button>
              {busy && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>

            {/* Timeline */}
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Replay timeline</span>
                <span>
                  {Math.max(0, cursor + 1)} / {messages.length}
                </span>
              </div>
              <div className="flex gap-1">
                {messages.map((m, i) => (
                  <button
                    key={m.index}
                    title={`${m.role}: ${m.content.slice(0, 60)}`}
                    onClick={() => {
                      setPlaying(false);
                      void step(i);
                    }}
                    className={cn(
                      "h-2 flex-1 rounded-full transition-colors",
                      i <= cursor ? "bg-primary" : "bg-accent",
                      i === cursor && "ring-2 ring-primary/40",
                    )}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      {!transcript ? (
        <section className="surface rounded-2xl p-10 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold">No transcript loaded</h2>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            Upload a <span className="font-mono">.txt</span> transcript with lines like
            <span className="font-mono"> Customer: …</span> and <span className="font-mono">Agent: …</span>,
            or load the sample to see replay mode in action.
          </p>
        </section>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1fr)]">
          {/* Transcript playback */}
          <section className="surface flex min-h-[520px] flex-col overflow-hidden rounded-2xl">
            <PanelHeader
              icon={FileText}
              title="Transcript playback"
              subtitle={`${analysed.length} of ${messages.length} replayed`}
            />
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-5">
                {messages.map((m, i) => (
                  <Bubble key={m.index} m={m} active={i === cursor} dim={i > cursor} />
                ))}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          </section>

          {/* Coaching + intent */}
          <section className="surface flex min-h-[520px] flex-col overflow-hidden rounded-2xl">
            <PanelHeader
              icon={Sparkles}
              title="Live coaching feed"
              subtitle={
                latest?.coaching
                  ? `score ${Math.round(latest.coaching.coaching_score ?? 0)}/100`
                  : "awaiting first step"
              }
            />
            <ScrollArea className="min-h-0 flex-1">
              <div className="space-y-4 p-5">
                <CoachingFeed coaching={latest?.coaching ?? null} risk={latest?.risk ?? null} />
                <div className="pt-2">
                  <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <Brain className="h-3.5 w-3.5 text-primary" /> Intent &amp; sentiment
                  </h3>
                  <IntentAnalysisPanel
                    analysis={latest?.analysis ?? null}
                    risk={latest?.risk ?? null}
                    emotionTimeline={emotionTimeline}
                  />
                </div>
              </div>
            </ScrollArea>
          </section>

          {/* Knowledge / escalation / trace */}
          <section className="surface flex min-h-[520px] flex-col overflow-hidden rounded-2xl">
            <div className="flex gap-1 border-b border-border p-2">
              {(
                [
                  { id: "knowledge" as const, label: "Knowledge", icon: BookOpen },
                  { id: "escalation" as const, label: "Escalation", icon: ShieldAlert },
                  { id: "trace" as const, label: "Trace", icon: Workflow },
                ]
              ).map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition",
                      tab === t.id
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="truncate">{t.label}</span>
                  </button>
                );
              })}
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <div className="p-5">
                {tab === "knowledge" && <KnowledgePanel chunks={latest?.knowledge ?? []} />}
                {tab === "escalation" && <EscalationPanel risk={latest?.risk ?? null} />}
                {tab === "trace" && <AgentTraceTimeline trace={latest?.agent_trace ?? []} />}
              </div>
            </ScrollArea>
          </section>
        </div>
      )}
    </div>
  );
}

function PanelHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Brain;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-border px-5 py-4">
      <Icon className="h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Bubble({ m, active, dim }: { m: ReplayMessage; active: boolean; dim: boolean }) {
  const isAgent = m.role === "agent";
  return (
    <div
      className={cn(
        "flex gap-3 transition-opacity",
        dim && "opacity-40",
        isAgent && "flex-row-reverse",
      )}
    >
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full",
          isAgent ? "bg-brand text-primary-foreground" : "bg-accent",
        )}
      >
        {isAgent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
          isAgent ? "rounded-tr-md bg-primary/10" : "surface rounded-tl-md",
          active && "ring-2 ring-primary/40",
        )}
      >
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {isAgent ? "Agent" : m.role === "system" ? "System" : "Customer"} · #{m.index + 1}
        </div>
        <p className="wrap-anywhere whitespace-pre-wrap">{m.content}</p>
      </div>
    </div>
  );
}
