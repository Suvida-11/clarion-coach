import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "@/lib/api";
import type { ChatTurnResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrentUser } from "@/lib/user";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Brain,
  BookOpen,
  ShieldAlert,
  Sparkles,
  Workflow,
  Loader2,
  ClipboardPaste,
  History,
  Trash2,
} from "lucide-react";
import { CoachingFeed } from "@/components/CoachingFeed";
import { KnowledgePanel } from "@/components/KnowledgePanel";
import { EscalationPanel, EscalationBanner } from "@/components/EscalationPanel";
import { AgentTraceTimeline } from "@/components/AgentTraceTimeline";
import { IntentAnalysisPanel } from "@/components/IntentAnalysisPanel";
import { recordSnapshot } from "@/lib/live-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/manual")({
  head: () => ({
    meta: [
      { title: "Manual Mode — Clarion Coach" },
      {
        name: "description",
        content:
          "Paste a real customer message and run the full AI pipeline: intent, knowledge, coaching and escalation analysis.",
      },
      { property: "og:title", content: "Manual Mode — Clarion Coach" },
      {
        property: "og:description",
        content: "Analyse any customer message through the Clarion Coach agent pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ManualMode,
});

interface HistoryItem {
  id: string;
  message: string;
  at: string;
  result: ChatTurnResponse;
}

function ManualMode() {
  const currentUser = useCurrentUser();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChatTurnResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  async function analyze() {
    if (!message.trim() || loading) return;
    setLoading(true);
    try {
      let sid = sessionId;
      if (!sid) {
        const sess = await api.startSession({
          mode: "manual",
          persona: "Calm",
          scenario: "Manual analysis",
          product: "General",
          difficulty: "Medium",
          language: "English",
        });
        sid = sess.id;
        setSessionId(sid);
      }
      const resp = await api.chat({
        session_id: sid,
        message,
        role: "customer",
        agent_name: currentUser?.name,
      });
      setResult(resp);
      recordSnapshot(sid, "manual", resp);
      setHistory((h) => [
        { id: `${Date.now()}`, message, at: new Date().toISOString(), result: resp },
        ...h,
      ]);
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manual mode</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Paste a real customer message and run the complete pipeline — Intent &amp; Sentiment,
            Knowledge Recommendation, Coaching and Escalation Monitor.
          </p>
        </div>
        {sessionId && (
          <Badge variant="outline" className="font-mono text-xs">
            {sessionId}
          </Badge>
        )}
      </header>

      {/* Input */}
      <section className="surface rounded-2xl p-5 md:p-6">
        <label
          htmlFor="manual-message"
          className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <ClipboardPaste className="h-4 w-4 text-primary" />
          Customer message
        </label>
        <Textarea
          id="manual-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyze();
          }}
          placeholder="Paste the customer message here…"
          className="min-h-[160px] resize-y text-sm leading-relaxed"
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to analyse</p>
          <Button
            onClick={analyze}
            disabled={loading || !message.trim()}
            size="lg"
            className="bg-brand text-primary-foreground hover:opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" /> Analyze message
              </>
            )}
          </Button>
        </div>
      </section>

      <EscalationBanner risk={result?.risk} />

      {/* Results */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ResultCard icon={Brain} title="Intent & sentiment">
            <IntentAnalysisPanel analysis={result?.analysis} risk={result?.risk} />
          </ResultCard>
          <ResultCard icon={BookOpen} title="Knowledge recommendations">
            <KnowledgePanel chunks={result?.knowledge ?? []} />
          </ResultCard>
          <ResultCard icon={Workflow} title="Agent trace">
            <AgentTraceTimeline trace={result?.agent_trace} />
          </ResultCard>
        </div>
        <div className="space-y-6">
          <ResultCard icon={Sparkles} title="Coaching">
            <CoachingFeed coaching={result?.coaching} risk={result?.risk} />
          </ResultCard>
          <ResultCard icon={ShieldAlert} title="Escalation">
            <EscalationPanel risk={result?.risk} />
          </ResultCard>
        </div>
      </div>

      {/* Session history */}
      <section className="surface rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <History className="h-4 w-4 text-primary" />
            Session history
            <span className="text-xs font-normal text-muted-foreground">({history.length})</span>
          </h2>
          {history.length > 0 && (
            <Button size="sm" variant="ghost" onClick={() => setHistory([])}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          <div className="divide-y divide-border">
            {history.length === 0 && (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                Analysed messages from this session will appear here.
              </p>
            )}
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => setResult(h.result)}
                className="flex w-full items-start gap-3 px-5 py-3.5 text-left transition-colors hover:bg-accent/30"
              >
                <span className="min-w-0 flex-1">
                  <span className="wrap-anywhere line-clamp-2 block text-sm leading-relaxed">
                    {h.message}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {h.result.analysis.intent}
                    </Badge>
                    <span className="capitalize">{h.result.analysis.sentiment}</span>
                    <span>·</span>
                    <span>{h.result.risk.level} risk</span>
                    <span>·</span>
                    <span>{format(new Date(h.at), "HH:mm:ss")}</span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </section>
    </div>
  );
}

function ResultCard({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: typeof Brain;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface overflow-hidden rounded-2xl", className)}>
      <div className="border-b border-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
