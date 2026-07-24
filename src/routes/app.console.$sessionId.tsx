import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ChatMessage, ChatTurnResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Send,
  AlertTriangle,
  Sparkles,
  ThumbsUp,
  Type as TypeIcon,
  Heart,
  Award,
  User,
  Bot,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { AgentExecutionPanel } from "@/components/AgentExecutionPanel";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  async function send() {
    if (!input.trim()) return;
    const text = input;
    setInput("");
    setLoading(true);
    try {
      const resp = await api.chat({ session_id: sessionId, message: text, role: "agent" });
      setMessages((m) => [...m, resp.turn]);
      setLatest(resp);
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

  const risk = latest?.risk;
  const analysis = latest?.analysis;
  const coaching = latest?.coaching;
  const kb = latest?.knowledge ?? [];

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-[1600px] flex-col gap-3 pb-6">
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
        {risk && (
          <div className="flex shrink-0 items-center gap-2">
            <Badge
              variant={risk.level === "high" || risk.level === "critical" ? "destructive" : "secondary"}
              className="gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {risk.level.toUpperCase()} · {(risk.probability * 100).toFixed(0)}%
            </Badge>
          </div>
        )}
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
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1.2fr_1.3fr_1fr]">
        {/* LEFT: Conversation */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <PanelHeader title="Conversation" subtitle={`${messages.length} turns`} />
          <ScrollArea className="flex-1 px-4">
            <div ref={scrollRef} className="space-y-4 py-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
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

        {/* CENTER: Coaching */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <PanelHeader
            title="AI Coaching"
            subtitle="Intent · Sentiment · Suggestions"
          />
          <ScrollArea className="flex-1 p-4">
            {!latest ? (
              <EmptyState
                icon={Sparkles}
                title="Waiting for the first turn"
                body="Send a message to activate the coaching agents."
              />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Metric label="Intent" value={analysis!.intent} />
                  <Metric
                    label="Sentiment"
                    value={analysis!.sentiment.replace("_", " ")}
                    accent={
                      analysis!.sentiment_score > 0
                        ? "text-success"
                        : analysis!.sentiment_score < -0.3
                          ? "text-destructive"
                          : "text-warning"
                    }
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Bar label="Frustration" value={analysis!.frustration} tone="destructive" />
                  <Bar label="Urgency" value={analysis!.urgency} tone="warning" />
                  <Bar label="Confidence" value={analysis!.confidence} tone="primary" />
                </div>

                <Separator />

                <div>
                  <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Suggested response
                  </h4>
                  <div className="glass rounded-lg p-3 text-sm leading-relaxed">
                    {coaching!.suggested_response}
                  </div>
                </div>

                <CoachSection icon={TypeIcon} label="Tone" items={coaching!.tone_notes} />
                <CoachSection icon={Heart} label="Empathy" items={coaching!.empathy_notes} />
                <CoachSection icon={ThumbsUp} label="Grammar" items={coaching!.grammar_notes} />
                <CoachSection icon={Award} label="Professionalism" items={coaching!.professional_notes} />
              </div>
            )}
          </ScrollArea>
        </section>

        {/* RIGHT: Knowledge */}
        <section className="surface flex min-h-0 flex-col rounded-2xl">
          <PanelHeader
            title="Knowledge Recommendations"
            subtitle={`${kb.length} sources · RAG`}
          />
          <ScrollArea className="flex-1 p-4">
            {kb.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No retrievals yet"
                body="Knowledge chunks appear as the conversation progresses."
              />
            ) : (
              <div className="space-y-3">
                {kb.map((c) => (
                  <div key={c.id} className="glass hover-lift rounded-lg p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                      <span className="text-xs font-semibold text-primary">
                        {(c.similarity * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-sm font-semibold">{c.title}</div>
                    <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                      {c.preview}
                    </p>
                    <div className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                      {c.source}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </section>
      </div>

      {/* Agent Execution Pipeline */}
      <AgentExecutionPanel trace={latest?.agent_trace} />
    </div>
  );
}

function PanelHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-4 py-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      <span className="text-xs text-muted-foreground">{subtitle}</span>
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isAgent = m.role === "agent";
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
          {format(new Date(m.timestamp), "HH:mm:ss")}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent = "text-foreground" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="glass rounded-lg p-3">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm font-semibold capitalize ${accent}`}>{value}</div>
    </div>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: "destructive" | "warning" | "primary" }) {
  const toneClass = {
    destructive: "bg-destructive",
    warning: "bg-warning",
    primary: "bg-primary",
  }[tone];
  return (
    <div className="glass rounded-lg p-3">
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="uppercase text-muted-foreground">{label}</span>
        <span className="font-semibold">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div className={`h-full ${toneClass}`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

function CoachSection({ icon: Icon, label, items }: { icon: typeof Sparkles; label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </h4>
      <ul className="space-y-1.5">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span className="text-foreground/90">{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({ icon: Icon, title, body }: { icon: typeof Sparkles; title: string; body: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center">
      <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent">
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="font-medium">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

// used
void Progress;
