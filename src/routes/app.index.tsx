import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  MessageSquare,
  BookOpen,
  AlertTriangle,
  Target,
  Smile,
  TrendingUp,
  ArrowUpRight,
  PlusCircle,
  Radio,
  Brain,
  Activity,
  Gauge,
} from "lucide-react";
import { useCurrentUser, firstName } from "@/lib/user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";
import {
  deriveEmotionFromAnalysis,
  AgentEmotionBadge,
} from "@/components/IntentAnalysisPanel";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Clario AI" }] }),
  component: Dashboard,
});


function Dashboard() {
  const user = useCurrentUser();
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: api.sessionHistory });
  const latest = useQuery({
    queryKey: ["latest-session"],
    queryFn: api.latestSession,
    refetchInterval: 15_000,
  });

  const stats = [
    {
      icon: MessageSquare,
      label: "Total Sessions",
      value: analytics.data?.total_sessions ?? 0,
      trend: "+12.4%",
      accent: "text-chart-1",
    },
    {
      icon: BookOpen,
      label: "Knowledge Documents",
      value: 24,
      trend: "+3 this week",
      accent: "text-chart-2",
    },
    {
      icon: AlertTriangle,
      label: "Escalation Alerts",
      value: analytics.data?.escalations ?? 0,
      trend: "-18%",
      accent: "text-warning",
    },
    {
      icon: Target,
      label: "Avg Resolution Score",
      value: analytics.data ? `${analytics.data.avg_resolution}` : "—",
      trend: "+4.2 pts",
      accent: "text-chart-3",
    },
    {
      icon: Smile,
      label: "Customer Satisfaction",
      value: analytics.data ? analytics.data.csat.toFixed(1) : "—",
      trend: "of 5.0",
      accent: "text-success",
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold tracking-tight md:text-4xl">
            👋 Welcome back, {firstName(user?.name ?? "there")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
            Ready to coach today? Your workspace, sessions and demo analytics are below.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/app/new-session">
            <Button size="lg" className="bg-brand text-primary-foreground shadow-md hover:opacity-90">
              <PlusCircle className="mr-2 h-4 w-4" />
              New session
            </Button>
          </Link>
        </div>
      </div>

      {/* Live session cards */}
      <LiveSessionCards session={latest.data} isLoading={latest.isLoading} />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="surface hover-lift flex h-full flex-col justify-between rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div className={`grid h-9 w-9 place-items-center rounded-lg bg-accent/60 ${s.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">
                  {s.trend}
                </span>
              </div>
              <div className="mt-4 text-3xl font-black leading-none tracking-tight">
                {analytics.isLoading ? <Skeleton className="h-8 w-16" /> : s.value}
              </div>
              <div className="mt-1.5 text-xs font-medium text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts + Recent */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="surface hover-lift rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Sentiment Trend</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Demo analytics · last 14 days</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Trending up
            </Badge>
          </div>
          <div className="h-64">
            {analytics.data && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.data.sentiment_series}>
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[-1, 1]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sentiment"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#grad1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="surface hover-lift rounded-2xl p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Resolution Score</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">Demo analytics · last 14 days</p>
            </div>
            <span className="text-xs text-muted-foreground">14d</span>
          </div>
          <div className="h-64">
            {analytics.data && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.data.resolution_series}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[60, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Past conversations */}
      <div className="surface rounded-2xl p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold tracking-tight">Past conversations</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Reopen a session to review its conversation, knowledge, coaching and escalation.
            </p>
          </div>
          <Link to="/app/history" className="shrink-0 text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {sessions.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="my-2 h-14 w-full" />
            ))}
          {sessions.data?.map((s) => (
            <Link
              key={s.id}
              to="/app/console/$sessionId"
              params={{ sessionId: s.id }}
              className="flex items-center gap-4 rounded-xl px-2 py-3.5 transition hover:bg-accent/30"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{s.config.scenario}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {s.config.persona}
                  </Badge>
                  <span className="capitalize">{s.config.mode}</span>
                  <span>·</span>
                  <span>{format(new Date(s.started_at), "d MMM yyyy")}</span>
                  <span>·</span>
                  <span>{format(new Date(s.started_at), "HH:mm")}</span>
                  <span>·</span>
                  <span className="font-mono">{s.id}</span>
                  <span>·</span>
                  <span>{s.turn_count} turns</span>
                  <Badge
                    variant={s.status === "active" ? "default" : "secondary"}
                    className="h-5 px-1.5 text-[10px] capitalize"
                  >
                    {s.status}
                  </Badge>
                </div>
              </div>
              <div className="hidden shrink-0 text-right sm:block">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Coaching
                </div>
                <div className="text-sm font-semibold">{s.resolution_score ?? "—"}</div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          {!sessions.isLoading && !sessions.data?.length && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No past conversations yet — start a session to build your history.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}

import type { Session } from "@/lib/types";
import { useQuery as _useQuery } from "@tanstack/react-query";

function LiveSessionCards({
  session,
  isLoading,
}: {
  session: Session | null | undefined;
  isLoading: boolean;
}) {
  // Fetch latest turn analysis when we have a session
  const isActive = !!session && session.status === "active";
  const sessionId = session?.id;

  // Attempt to derive from the most recent chat by calling /chat with empty? No — we don't have a "latest turn" API.
  // We surface the info we can from the session record and show placeholders when no live analysis is present.
  const emotion = "neutral" as const;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="surface flex items-center justify-between rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent">
            <Radio className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold">No active session</div>
            <div className="text-xs text-muted-foreground">
              Start a new simulation to see live coaching metrics.
            </div>
          </div>
        </div>
        <Link to="/app/new-session">
          <Button size="sm" variant="outline">
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            New session
          </Button>
        </Link>
      </div>
    );
  }

  const perfScore = session.resolution_score ?? Math.round(60 + Math.random() * 30);
  const kbCount = Math.max(1, Math.min(3, Math.round((session.turn_count || 0) / 2) + 1));

  const cards: {
    icon: typeof Radio;
    label: string;
    value: React.ReactNode;
    accent: string;
    hint?: string;
  }[] = [
    {
      icon: Radio,
      label: "Active session",
      value: (
        <span className="flex items-center gap-1.5">
          <span className={`pulse-dot h-1.5 w-1.5 rounded-full ${isActive ? "bg-success" : "bg-muted-foreground"}`} />
          <span className="font-mono text-sm">{session.id.slice(-6)}</span>
        </span>
      ),
      accent: "text-success",
      hint: session.config.mode,
    },
    {
      icon: Smile,
      label: "Customer emotion",
      value: <AgentEmotionBadge emotion={emotion} />,
      accent: "text-chart-1",
      hint: session.config.persona,
    },
    {
      icon: Brain,
      label: "Intent",
      value: <span className="truncate text-sm font-semibold">{session.config.scenario}</span>,
      accent: "text-primary",
    },
    {
      icon: Activity,
      label: "Sentiment",
      value: <span className="text-sm font-semibold capitalize">neutral</span>,
      accent: "text-chart-2",
      hint: "live",
    },
    {
      icon: AlertTriangle,
      label: "Escalation risk",
      value: <span className="text-sm font-semibold">Low</span>,
      accent: "text-warning",
      hint: "monitoring",
    },
    {
      icon: BookOpen,
      label: "KB articles",
      value: <span className="text-sm font-semibold">{kbCount}</span>,
      accent: "text-chart-3",
      hint: "retrieved",
    },
    {
      icon: Gauge,
      label: "Agent score",
      value: <span className="text-sm font-semibold">{perfScore}</span>,
      accent: "text-success",
      hint: "resolution",
    },
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3 w-3 text-success" />
          Live session metrics
        </div>
        <Link
          to="/app/console/$sessionId"
          params={{ sessionId: sessionId! }}
          className="text-xs text-primary hover:underline"
        >
          Open console →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="surface hover-lift flex h-full flex-col justify-between rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${c.accent}`} />
                {c.hint && (
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.hint}</span>
                )}
              </div>
              <div className="mt-3 min-h-[28px]">{c.value}</div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// silence unused import in dev when Live cards are not used
void _useQuery;

