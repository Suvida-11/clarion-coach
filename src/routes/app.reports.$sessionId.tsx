import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api, USING_MOCKS } from "@/lib/api";
import { readArchiveOrLatest } from "@/lib/session-archive";
import { buildReportPdf } from "@/lib/report-pdf";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Award, AlertCircle, ArrowUpRight, Download, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/lib/user";

export const Route = createFileRoute("/app/reports/$sessionId")({
  head: () => ({ meta: [{ title: "Post-Interaction Report — Clario AI" }] }),
  component: ReportPage,
});

function ReportPage() {
  const { sessionId } = Route.useParams();
  const q = useQuery({ queryKey: ["report", sessionId], queryFn: () => api.report(sessionId) });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api.sessionHistory() });
  const user = useCurrentUser();
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      let blob: Blob;
      if (USING_MOCKS) {
        const report = q.data ?? (await api.report(sessionId));
        const archive = readArchiveOrLatest(sessionId);
        const config =
          sessions.data?.find((s) => s.id === sessionId)?.config ?? archive?.config;
        blob = buildReportPdf({
          report,
          sessionId,
          userName: user?.name,
          archive,
          scenario: config?.scenario,
          product: config?.product,
          persona: config?.persona,
          mode: config?.mode,
        });
      } else {
        blob = await api.reportPdf(sessionId, user?.name);
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clarion-coach-report-${sessionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast.success("Report downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to download report");
    } finally {
      setDownloading(false);
    }
  }


  if (!q.data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const r = q.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">Post-Interaction Report</div>
          <h1 className="mt-1 truncate text-2xl font-bold md:text-3xl">
            Session <span className="font-mono">{sessionId}</span>
          </h1>
        </div>
        <Button variant="outline" onClick={handleDownload} disabled={downloading}>
          {downloading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-1.5 h-4 w-4" />
          )}
          Download PDF
        </Button>
      </div>

      {/* Score */}
      <div className="glass ring-glow flex items-center gap-6 rounded-2xl p-6">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand text-3xl font-black text-primary-foreground">
          {r.resolution_score}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs uppercase text-muted-foreground">Resolution score</div>
          <div className="text-lg font-semibold">Strong resolution</div>
          <p className="mt-1 text-sm text-muted-foreground">{r.summary}</p>
        </div>
      </div>

      {/* Sentiment journey */}
      <div className="surface rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Sentiment journey</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={r.sentiment_timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="turn" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[-1, 1]} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="score" stroke="var(--chart-1)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Timeline */}
        <div className="surface rounded-2xl p-5">
          <h3 className="mb-3 font-semibold">Intent progression</h3>
          <ol className="space-y-3">
            {r.intent_progression.map((intent, i) => (
              <li key={intent} className="flex gap-3">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold">
                  {i + 1}
                </div>
                <div className="text-sm">{intent}</div>
              </li>
            ))}
          </ol>
        </div>

        {/* Escalation events */}
        <div className="surface rounded-2xl p-5">
          <h3 className="mb-3 font-semibold">Escalation events</h3>
          <div className="space-y-3">
            {r.escalation_events.map((e) => (
              <div key={e.turn} className="flex items-start gap-2">
                <AlertCircle
                  className={`mt-0.5 h-4 w-4 shrink-0 ${
                    e.level === "high" ? "text-destructive" : "text-warning"
                  }`}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium">
                    Turn {e.turn} · <span className="uppercase">{e.level}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{e.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Knowledge used */}
      <div className="surface rounded-2xl p-5">
        <h3 className="mb-3 font-semibold">Knowledge articles used</h3>
        <div className="space-y-2">
          {r.knowledge_used.map((c) => (
            <div key={c.id} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                  <span className="text-sm font-semibold">{c.title}</span>
                </div>
                <span className="text-xs font-semibold text-primary">
                  {(c.similarity * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{c.preview}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Strengths + weaknesses */}
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Strengths" icon={Award} tone="success" items={r.strengths} />
        <Panel title="Weaknesses" icon={AlertCircle} tone="destructive" items={r.weaknesses} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Improvement tips" icon={ArrowUpRight} tone="primary" items={r.improvements} />
        <Panel title="Coaching recommendations" icon={Sparkles} tone="primary" items={r.recommendations} />
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  tone,
  items,
}: {
  title: string;
  icon: typeof Award;
  tone: "success" | "destructive" | "primary";
  items: string[];
}) {
  const toneClass = {
    success: "text-success",
    destructive: "text-destructive",
    primary: "text-primary",
  }[tone];
  return (
    <div className="surface rounded-2xl p-5">
      <h3 className={`mb-3 flex items-center gap-1.5 font-semibold ${toneClass}`}>
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      <ul className="space-y-2 text-sm">
        {items.map((i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${toneClass}`} />
            <span>{i}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
