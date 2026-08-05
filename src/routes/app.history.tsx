import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { listArchives } from "@/lib/session-archive";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  MessagesSquare,
  Search,
  ArrowUpRight,
  FileText,
  History as HistoryIcon,
} from "lucide-react";

export const Route = createFileRoute("/app/history")({
  head: () => ({
    meta: [
      { title: "Past Conversations — Clarion Coach" },
      {
        name: "description",
        content:
          "Browse every coaching session with its issue, date, session ID, status and turn count, then reopen it to restore the full analysis.",
      },
      { property: "og:title", content: "Past Conversations — Clarion Coach" },
      {
        property: "og:description",
        content: "Reopen any past coaching session and restore its transcript and analysis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PastConversations,
});

function PastConversations() {
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: () => api.sessionHistory() });
  const [q, setQ] = useState("");
  const archives = useMemo(() => listArchives(), []);

  const rows = useMemo(() => {
    const bySession = new Map(archives.map((a) => [a.session_id, a]));
    const list = (sessions.data ?? []).map((s) => {
      const archive = bySession.get(s.id);
      return {
        id: s.id,
        issue: s.config.scenario,
        persona: String(s.config.persona),
        mode: String(s.config.mode),
        started_at: archive?.updated_at ?? s.started_at,
        status: s.status,
        turns: archive?.messages.length ?? s.turn_count,
        score:
          archive?.turns.length
            ? Math.round(
                archive.turns.reduce((a, t) => a + (t.coaching?.coaching_score ?? 0), 0) /
                  archive.turns.length,
              )
            : s.resolution_score,
        restored: !!archive?.messages.length,
      };
    });
    // Archived sessions that are not in the API history (locally created).
    for (const a of archives) {
      if (list.some((r) => r.id === a.session_id)) continue;
      list.push({
        id: a.session_id,
        issue: a.config?.scenario ?? "Coaching session",
        persona: String(a.config?.persona ?? "—"),
        mode: String(a.config?.mode ?? "simulator"),
        started_at: a.updated_at,
        status: "completed" as const,
        turns: a.messages.length,
        score: a.turns.length
          ? Math.round(
              a.turns.reduce((x, t) => x + (t.coaching?.coaching_score ?? 0), 0) / a.turns.length,
            )
          : null,
        restored: !!a.messages.length,
      });
    }
    const term = q.trim().toLowerCase();
    return list
      .filter(
        (r) =>
          !term ||
          r.issue.toLowerCase().includes(term) ||
          r.id.toLowerCase().includes(term) ||
          String(r.persona).toLowerCase().includes(term),
      )
      .sort((a, b) => (a.started_at < b.started_at ? 1 : -1));
  }, [sessions.data, archives, q]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Past conversations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Reopen any session to restore its conversation, coaching feed, knowledge
            recommendations, escalation history and summary.
          </p>
        </div>
        <Link to="/app/new-session">
          <Button className="bg-brand text-primary-foreground hover:opacity-90">
            <HistoryIcon className="mr-1.5 h-4 w-4" />
            New session
          </Button>
        </Link>
      </header>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by issue, persona or session ID…"
          className="h-11 pl-10"
        />
      </div>

      <section className="surface rounded-2xl p-2 md:p-4">
        {sessions.isLoading && (
          <div className="space-y-2 p-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}
        <div className="divide-y divide-border">
          {rows.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-4 rounded-xl px-3 py-4 transition hover:bg-accent/30"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <MessagesSquare className="h-4 w-4" />
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="wrap-anywhere text-sm font-semibold">{r.issue}</div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {r.persona}
                  </Badge>
                  <span className="capitalize">{r.mode}</span>
                  <span>·</span>
                  <span>{format(new Date(r.started_at), "d MMM yyyy")}</span>
                  <span>·</span>
                  <span>{format(new Date(r.started_at), "HH:mm")}</span>
                  <span>·</span>
                  <span className="font-mono">{r.id}</span>
                  <span>·</span>
                  <span>{r.turns} turns</span>
                  <Badge
                    variant={r.status === "active" ? "default" : "secondary"}
                    className="h-5 px-1.5 text-[10px] capitalize"
                  >
                    {r.status}
                  </Badge>
                  {r.restored && (
                    <Badge className="h-5 bg-success/15 px-1.5 text-[10px] text-success">
                      transcript saved
                    </Badge>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Coaching
                </div>
                <div className="text-sm font-semibold">{r.score ?? "—"}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link to="/app/reports/$sessionId" params={{ sessionId: r.id }}>
                  <Button size="sm" variant="outline">
                    <FileText className="mr-1.5 h-3.5 w-3.5" />
                    Report
                  </Button>
                </Link>
                <Link to="/app/console/$sessionId" params={{ sessionId: r.id }}>
                  <Button size="sm">
                    Open
                    <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
          {!sessions.isLoading && !rows.length && (
            <p className="py-14 text-center text-sm text-muted-foreground">
              No conversations match your search yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
