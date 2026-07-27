import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, ChatTurnResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AgentExecutionPanel } from "@/components/AgentExecutionPanel";
import { useCurrentUser, firstName } from "@/lib/user";
import { Input } from "@/components/ui/input";
import { IntentAnalysisPanel, type EmotionPoint, deriveEmotionFromAnalysis } from "@/components/IntentAnalysisPanel";
import { CoachingPanel } from "@/components/CoachingPanel";
import { KnowledgePanel } from "@/components/KnowledgePanel";

export const Route = createFileRoute("/app/console/$sessionId")({
  head: () => ({ meta: [{ title: "Live Coaching Console — Clario AI" }] }),
  component: Console,
});


function Console() {
  const { sessionId } = Route.useParams();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "seed1",
      role: "customer",
      content:
        "This is absolutely ridiculous. My order came in broken and no one is responding!",
      timestamp: new Date(Date.now() - 60_000).toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [latest, setLatest] = useState<ChatTurnResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [search, setSearch] = useState("");
  const [replayIndex, setReplayIndex] = useState<number | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<ChatTurnResponse[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    if (!input.trim() || paused || ended) return;
    const text = input;
    setInput("");
    setLoading(true);
    try {
      const resp = await api.chat({ session_id: sessionId, message: text, role: "agent" });
      setMessages((m) => [...m, resp.turn]);
      setLatest(resp);
      setAnalysisHistory((h) => [...h, resp]);
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
      .map((m) => `[${format(new Date(m.timestamp), "HH:mm:ss")}] ${m.role.toUpperCase()}: ${m.content}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clario-session-${sessionId}.txt`;
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
  const emotionTimeline = useMemo<EmotionPoint[]>(() => {
    return analysisHistory.map((h, i) => {
      const emo = deriveEmotionFromAnalysis(h.analysis);
      const value =
        emo === "happy" ? 2 : emo === "neutral" ? 0 : emo === "confused" ? -1 : emo === "frustrated" ? -1.5 : -2;
      return { turn: i + 1, emotion: emo, value };
    });
  }, [analysisHistory]);
  const emotion = deriveEmotion(analysis);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1600px] flex-col gap-4 pb-8">
      {/* Session header + risk */}
      <div className="glass grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl p-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-success" />
            Live · <span className="font-mono">{sessionId}</span>
          </div>
          <div className="truncate text-sm font-semibold">
            Refund dispute — Orbit Wireless Earbuds
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <EmotionBadge emotion={emotion} />
          {risk && (
            <Badge
              variant={risk.level === "high" || risk.level === "critical" ? "destructive" : "secondary"}
              className="gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {risk.level.toUpperCase()} · {(risk.probability * 100).toFixed(0)}%
            </Badge>
          )}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background/40 p-0.5">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => setPaused((p) => !p)}
              disabled={ended}
              title={paused ? "Resume" : "Pause"}
            >
              {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {paused ? "Resume" : "Pause"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => {
                setMessages([]);
                setLatest(null);
                setEnded(false);
                setPaused(false);
                setReplayIndex(null);
                setAnalysisHistory([]);
                toast.success("Simulation reset");
              }}
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
              onClick={() => {
                setEnded(true);
                setPaused(true);
                toast.info("Simulation ended");
              }}
              disabled={ended}
              title="End simulation"
            >
              <Square className="h-3 w-3" />
              End
            </Button>
          </div>
        </div>
      </div>

      {risk && (risk.level === "high" || risk.level === "critical") && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-destructive">Escalation risk elevated. </span>
            {risk.recommended_action}
          </div>
        </div>
      )}

      {/* Three-panel workspace */}
      <div className="grid min-h-0 gap-4 lg:h-[calc(100vh-14rem)] lg:grid-cols-[1.1fr_1fr_1fr_1fr]">
        {/* LEFT: Conversation */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold">Conversation</h3>
              <div className="text-xs text-muted-foreground">
                {messages.length} turns
                {paused && !ended && <span className="ml-1.5 text-warning">· paused</span>}
                {ended && <span className="ml-1.5 text-destructive">· ended</span>}
                {replayIndex !== null && <span className="ml-1.5 text-primary">· replaying</span>}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={replayConversation} title="Replay">
                <Play className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={downloadChat} title="Download">
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearChat} title="Clear">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <div className="border-b border-border px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversation…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-4">
            <div ref={scrollRef} className="space-y-4 py-4">
              {visibleMessages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
              {!visibleMessages.length && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  {search ? "No matches" : "Conversation is empty"}
                </div>
              )}
              {typing && (
                <div className="flex gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-accent">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="glass flex items-center gap-1 rounded-2xl rounded-tl-sm px-4 py-3">
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.15s" }} />
                    <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t border-border p-3">
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
                className="min-h-[80px] resize-none pr-12"
              />
              <Button
                size="icon"
                onClick={send}
                disabled={loading || !input.trim()}
                className="absolute bottom-2 right-2 h-8 w-8 bg-brand text-primary-foreground hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {coaching && (
              <button
                onClick={() => setInput(coaching.suggested_response)}
                className="mt-2 flex w-full items-center gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-xs hover:bg-primary/10"
              >
                <Sparkles className="h-3 w-3 shrink-0 text-primary" />
                <span className="line-clamp-1 flex-1">
                  <span className="font-semibold text-primary">Use suggestion:</span>{" "}
                  {coaching.suggested_response}
                </span>
              </button>
            )}
          </div>
        </section>

        {/* Intent & sentiment side panel */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <PanelHeader
            title="Intent & Sentiment"
            subtitle={analysis ? `conf ${(analysis.confidence * 100).toFixed(0)}%` : "awaiting"}
            icon={Brain}
          />
          <ScrollArea className="flex-1 p-4">
            <IntentAnalysisPanel
              analysis={analysis}
              risk={risk}
              emotionTimeline={emotionTimeline}
            />
          </ScrollArea>
        </section>

        {/* Coaching panel */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <PanelHeader
            title="AI Coaching"
            subtitle="Real-time guidance"
            icon={Sparkles}
          />
          <ScrollArea className="flex-1 p-4">
            <CoachingPanel
              coaching={coaching}
              risk={risk}
              onUseSuggestion={(t) => setInput(t)}
            />
          </ScrollArea>
        </section>

        {/* Knowledge recommendation panel */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <PanelHeader
            title="Knowledge Base"
            subtitle={`${kb.length} matches · RAG`}
            icon={BookOpen}
          />
          <ScrollArea className="flex-1 p-4">
            <KnowledgePanel chunks={kb} />
          </ScrollArea>
        </section>
      </div>


      {/* Agent Execution Pipeline */}
      <AgentExecutionPanel trace={latest?.agent_trace} />
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
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}


function MessageBubble({ m }: { m: ChatMessage }) {
  const isAgent = m.role === "agent";
  const user = useCurrentUser();
  const agentLabel = user ? firstName(user.name) : "You";
  return (
    <div className={`flex gap-2 ${isAgent ? "flex-row-reverse" : ""}`}>
      <div
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          isAgent ? "bg-brand text-primary-foreground" : "bg-accent"
        }`}
      >
        {isAgent ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={`max-w-[75%] ${isAgent ? "items-end" : ""} flex flex-col`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm ${
            isAgent
              ? "rounded-tr-sm bg-brand text-primary-foreground"
              : "glass rounded-tl-sm"
          }`}
        >
          {m.content}
        </div>
        <div className="mt-1 px-1 text-[10px] text-muted-foreground">
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
    Frustrated: { Icon: Frown, className: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
    Angry: { Icon: AngryIcon, className: "bg-destructive/15 text-destructive border-destructive/30" },
  };
  const { Icon, className } = map[emotion];
  return (
    <div className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${className}`}>
      <Icon className="h-3 w-3" />
      {emotion}
    </div>
  );
}

// used
void Progress;
