import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, ChatTurnResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  AlertTriangle,
  Sparkles,
  User,
  Bot,
  Pause,
  Play,
  RotateCcw,
  Square,
  Download,
  Trash2,
  Search,
  Smile,
  Frown,
  Meh,
  Angry as AngryIcon,
  HelpCircle,
  Brain,
  BookOpen,
  ShieldAlert,
  Workflow,
  MessagesSquare,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useCurrentUser, firstName } from "@/lib/user";
import {
  IntentAnalysisPanel,
  type EmotionPoint,
  deriveEmotionFromAnalysis,
} from "@/components/IntentAnalysisPanel";
import { CoachingFeed } from "@/components/CoachingFeed";
import { KnowledgePanel } from "@/components/KnowledgePanel";
import { EscalationPanel, EscalationBanner } from "@/components/EscalationPanel";
import { AgentTraceTimeline } from "@/components/AgentTraceTimeline";
import { recordSnapshot } from "@/lib/live-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/console/$sessionId")({
  head: () => ({
    meta: [
      { title: "Live Support Console — Clarion Coach" },
      {
        name: "description",
        content:
          "Real-time AI coaching console with live intent analysis, knowledge recommendations, escalation monitoring and agent trace.",
      },
      { property: "og:title", content: "Live Support Console — Clarion Coach" },
      {
        property: "og:description",
        content: "Coach support agents in real time with a six-agent AI pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Console,
});

type RightTab = "knowledge" | "escalation" | "trace";

function Console() {
  const { sessionId } = Route.useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [latest, setLatest] = useState<ChatTurnResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [search, setSearch] = useState("");
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<ChatTurnResponse[]>([]);
  const [tab, setTab] = useState<RightTab>("knowledge");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  async function send() {
    if (!input.trim() || paused || ended || loading) return;
    const text = input;
    setInput("");
    setLoading(true);
    try {
      const resp = await api.chat({ session_id: sessionId, message: text, role: "agent" });
      setMessages((m) => [...m, resp.turn]);
      setLatest(resp);
      setAnalysisHistory((h) => [...h, resp]);
      recordSnapshot(sessionId, "simulator", resp);
      if (resp.simulated_customer_reply) {
        setTyping(true);
        setTimeout(() => {
          setMessages((m) => [...m, resp.simulated_customer_reply!]);
          setTyping(false);
        }, 900);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  }

  function downloadChat() {
    const text = messages
      .map(
        (m) =>
          `[${format(new Date(m.timestamp), "HH:mm:ss")}] ${m.role.toUpperCase()}: ${m.content}`,
      )
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clarion-session-${sessionId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded");
  }

  function clearChat() {
    setMessages([]);
    setLatest(null);
    setReplayIndex(null);
    setAnalysisHistory([]);
    toast.success("Conversation cleared");
  }

  function replayConversation() {
    if (!messages.length) return;
    setReplayIndex(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      if (i >= messages.length) {
        setReplayIndex(null);
        clearInterval(interval);
        return;
      }
      setReplayIndex(i);
    }, 900);
  }

  const visibleMessages = search.trim()
    ? messages.filter((m) => m.content.toLowerCase().includes(search.toLowerCase()))
    : replayIndex !== null
      ? messages.slice(0, replayIndex + 1)
      : messages;

  const risk = latest?.risk;
  const analysis = latest?.analysis;
  const coaching = latest?.coaching;
  const kb = latest?.knowledge ?? [];
  const emotionTimeline = useMemo<EmotionPoint[]>(
    () =>
      analysisHistory.map((h, i) => {
        const emo = deriveEmotionFromAnalysis(h.analysis);
        const value =
          emo === "happy"
            ? 2
            : emo === "neutral"
              ? 0
              : emo === "confused"
                ? -1
                : emo === "frustrated"
                  ? -1.5
                  : -2;
        return { turn: i + 1, emotion: emo, value };
      }),
    [analysisHistory],
  );
  const emotion = deriveEmotion(analysis);

  const tabs: { id: RightTab; label: string; icon: typeof BookOpen; count?: number }[] = [
    { id: "knowledge", label: "Knowledge", icon: BookOpen, count: kb.length },
    { id: "escalation", label: "Escalation", icon: ShieldAlert },
  ];


  return (
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
      {/* Session header */}
      <header className="surface flex flex-wrap items-center justify-between gap-4 rounded-2xl px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-success" />
            Live support console ·{" "}
            <span className="font-mono">{sessionId}</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">Simulator session</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <EmotionBadge emotion={emotion} />
          {risk && (
            <Badge
              variant={
                risk.level === "high" || risk.level === "critical" ? "destructive" : "secondary"
              }
              className="gap-1.5"
            >
              <AlertTriangle className="h-3 w-3" />
              {risk.level.toUpperCase()} · {(risk.probability * 100).toFixed(0)}%
            </Badge>
          )}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-background/40 p-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => setPaused((p) => !p)}
              disabled={ended}
            >
              {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs"
              onClick={() => {
                setMessages([]);
                setLatest(null);
                setEnded(false);
                setPaused(false);
                setReplayIndex(null);
                setAnalysisHistory([]);
                toast.success("Simulation reset");
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 gap-1.5 px-2.5 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                setEnded(true);
                setPaused(true);
                toast.info("Simulation ended");
              }}
              disabled={ended}
            >
              <Square className="h-3.5 w-3.5" />
              End
            </Button>
          </div>
        </div>
      </header>

      <EscalationBanner risk={risk} />

      {/* Three-column workspace */}
      <div className="grid min-h-0 gap-6 xl:h-[calc(100vh-16rem)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,0.95fr)]">
        {/* LEFT — conversation */}
        <section className="surface flex min-h-[520px] flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
                <MessagesSquare className="h-4 w-4 text-primary" />
                Conversation
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {messages.length} turns
                {paused && !ended && <span className="ml-1.5 text-warning">· paused</span>}
                {ended && <span className="ml-1.5 text-destructive">· ended</span>}
                {replayIndex !== null && <span className="ml-1.5 text-primary">· replaying</span>}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={replayConversation}
                title="Replay conversation"
              >
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={downloadChat}
                title="Download transcript"
              >
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={clearChat}
                title="Clear conversation"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          <div className="border-b border-border px-5 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversation…"
                className="h-9 pl-9 text-sm"
              />
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-6 px-5 py-6">
              {visibleMessages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
              {!visibleMessages.length && (
                <div className="py-16 text-center text-sm text-muted-foreground">
                  {search ? "No matching messages" : "Start the conversation below."}
                </div>
              )}
              {typing && (
                <div className="flex gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="surface flex items-center gap-1.5 rounded-2xl rounded-tl-md px-4 py-3">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <span
                      className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      style={{ animationDelay: "0.15s" }}
                    />
                    <span
                      className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground"
                      style={{ animationDelay: "0.3s" }}
                    />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Sticky composer */}
          <div className="sticky bottom-0 border-t border-border bg-card/95 p-4 backdrop-blur">
            {coaching && (
              <button
                onClick={() => setInput(coaching.suggested_response)}
                className="mb-3 flex w-full items-start gap-2.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3.5 py-2.5 text-left text-xs transition-colors hover:bg-primary/10"
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="wrap-anywhere line-clamp-2 flex-1 leading-relaxed">
                  <span className="font-semibold text-primary">Use suggestion: </span>
                  {coaching.suggested_response}
                </span>
              </button>
            )}
            <div className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Type your response as the support agent…"
                className="min-h-[92px] resize-none pr-14 text-sm leading-relaxed"
                disabled={paused || ended}
              />
              <Button
                size="icon"
                onClick={send}
                disabled={loading || !input.trim() || paused || ended}
                className="absolute bottom-2.5 right-2.5 h-9 w-9 bg-brand text-primary-foreground hover:opacity-90"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        {/* CENTER — live coaching feed */}
        <section className="surface flex min-h-[520px] flex-col overflow-hidden rounded-2xl">
          <PanelHeader
            icon={Sparkles}
            title="Live coaching feed"
            subtitle={
              coaching
                ? `score ${Math.round(
                    (coaching.coaching_score ?? 0) <= 1
                      ? (coaching.coaching_score ?? 0) * 100
                      : (coaching.coaching_score ?? 0),
                  )}/100`
                : "awaiting first turn"
            }
          />
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 p-5">
              <CoachingFeed coaching={coaching} risk={risk} onUseSuggestion={setInput} />
              <div className="pt-2">
                <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Brain className="h-3.5 w-3.5 text-primary" /> Intent &amp; sentiment
                </h3>
                <IntentAnalysisPanel
                  analysis={analysis}
                  risk={risk}
                  emotionTimeline={emotionTimeline}
                />
              </div>
            </div>
          </ScrollArea>
        </section>

        {/* RIGHT — knowledge / escalation / trace */}
        <section className="surface flex min-h-[520px] flex-col overflow-hidden rounded-2xl">
          <div className="flex gap-1 border-b border-border p-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent/40",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.label}</span>
                  {typeof t.count === "number" && t.count > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="p-5">
              {tab === "knowledge" && <KnowledgePanel chunks={kb} />}
              {tab === "escalation" && <EscalationPanel risk={risk} />}
            </div>
          </ScrollArea>
        </section>
      </div>

      {/* Developer mode — advanced agent execution details, hidden by default */}
      <section className="surface overflow-hidden rounded-2xl">
        <button
          onClick={() => setDevMode((d) => !d)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-accent/30"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <Workflow className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight">
                Developer mode · advanced details
              </span>
              <span className="block text-xs text-muted-foreground">
                Agent execution trace, timings and per-agent summaries
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            {!!latest?.agent_trace?.length && (
              <Badge variant="secondary" className="text-[10px]">
                {latest.agent_trace.length} agents
              </Badge>
            )}
            <ChevronDown
              className={cn("h-4 w-4 text-muted-foreground transition-transform", devMode && "rotate-180")}
            />
          </span>
        </button>
        {devMode && (
          <div className="border-t border-border p-5">
            <AgentTraceTimeline trace={latest?.agent_trace} />
          </div>
        )}
      </section>
    </div>
  );
}


function PanelHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
        {title}
      </h2>
      <span className="shrink-0 text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isAgent = m.role === "agent";
  const user = useCurrentUser();
  const agentLabel = user ? firstName(user.name) : "You";
  return (
    <div className={cn("flex gap-3", isAgent && "flex-row-reverse")}>
      <div
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full shadow-sm ring-1",
          isAgent ? "bg-brand text-primary-foreground ring-primary/30" : "bg-accent ring-border",
        )}
      >
        {isAgent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={cn("flex min-w-0 max-w-[82%] flex-col", isAgent && "items-end")}>
        <div
          className={cn(
            "wrap-anywhere whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm",
            isAgent
              ? "rounded-tr-md bg-primary text-primary-foreground"
              : "rounded-tl-md border border-border bg-card text-card-foreground",
          )}
        >
          {m.content}
        </div>
        <div className="mt-1.5 px-1 text-[10px] font-medium text-muted-foreground">
          {isAgent ? agentLabel : "Customer"} · {format(new Date(m.timestamp), "HH:mm:ss")}
        </div>
      </div>
    </div>
  );
}

type Emotion = "Happy" | "Neutral" | "Confused" | "Frustrated" | "Angry";

function deriveEmotion(analysis?: {
  sentiment: string;
  sentiment_score: number;
  frustration: number;
  confidence: number;
}): Emotion {
  if (!analysis) return "Neutral";
  if (analysis.frustration >= 0.75 || analysis.sentiment === "very_negative") return "Angry";
  if (analysis.frustration >= 0.45 || analysis.sentiment === "negative") return "Frustrated";
  if (analysis.confidence > 0 && analysis.confidence < 0.4) return "Confused";
  if (analysis.sentiment_score > 0.3 || analysis.sentiment === "positive") return "Happy";
  return "Neutral";
}

function EmotionBadge({ emotion }: { emotion: Emotion }) {
  const map: Record<Emotion, { Icon: typeof Smile; className: string }> = {
    Happy: { Icon: Smile, className: "bg-success/15 text-success border-success/30" },
    Neutral: { Icon: Meh, className: "bg-muted text-muted-foreground border-border" },
    Confused: { Icon: HelpCircle, className: "bg-warning/15 text-warning border-warning/30" },
    Frustrated: {
      Icon: Frown,
      className: "bg-orange-500/15 text-orange-400 border-orange-500/30",
    },
    Angry: {
      Icon: AngryIcon,
      className: "bg-destructive/15 text-destructive border-destructive/30",
    },
  };
  const { Icon, className } = map[emotion];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {emotion}
    </span>
  );
}
