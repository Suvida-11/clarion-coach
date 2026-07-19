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
} from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/app/")({
  head: () => ({ meta: [{ title: "Dashboard — Clario AI" }] }),
  component: Dashboard,
});

function Dashboard() {
  const analytics = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: api.sessionHistory });

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
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">
            Good afternoon, Maya 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Here's how your coaching workspace is performing today.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to="/app/new-session">
            <Button className="bg-brand text-primary-foreground hover:opacity-90">
              <PlusCircle className="mr-1.5 h-4 w-4" />
              New session
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="surface hover-lift rounded-xl p-4">
              <div className="flex items-center justify-between">
                <Icon className={`h-4 w-4 ${s.accent}`} />
                <span className="text-[10px] font-medium text-muted-foreground">
                  {s.trend}
                </span>
              </div>
              <div className="mt-3 text-2xl font-black">
                {analytics.isLoading ? <Skeleton className="h-7 w-16" /> : s.value}
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Charts + Recent */}
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Sentiment Trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days</p>
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

        <div className="surface rounded-2xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Resolution Score</h3>
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

      {/* Recent sessions */}
      <div className="surface rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold">Recent sessions</h3>
          <Link to="/app/analytics" className="text-xs text-primary hover:underline">
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
              className="flex items-center gap-4 py-3 transition hover:bg-accent/30"
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-xs font-mono">
                {s.id.slice(-4)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{s.config.scenario}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {s.config.persona}
                  </Badge>
                  <span>{s.config.mode}</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(s.started_at))} ago</span>
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <div className="text-xs text-muted-foreground">Resolution</div>
                <div className="text-sm font-semibold">
                  {s.resolution_score ?? "—"}
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
