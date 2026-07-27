import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export const Route = createFileRoute("/app/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Clario AI" }] }),
  component: Analytics,
});

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--muted-foreground)",
];

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

function Analytics() {
  const q = useQuery({ queryKey: ["analytics"], queryFn: api.analytics });

  if (!q.data) {
    return (
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  const d = q.data;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Performance Analytics</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
          How your team, agents, and knowledge base are performing.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Avg Sentiment" value={d.avg_sentiment.toFixed(2)} sub="−1 to +1" />
        <StatCard label="Avg Resolution" value={`${d.avg_resolution}`} sub="of 100" />
        <StatCard label="Escalations (14d)" value={String(d.escalations)} sub="handled" />
        <StatCard label="CSAT" value={d.csat.toFixed(1)} sub="of 5.0" accent="text-success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Escalation trend" subtitle="Daily escalations, last 14 days">
          <BarChart data={d.escalation_series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="escalations" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Agent improvement" subtitle="Resolution score over time">
          <LineChart data={d.resolution_series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[60, 100]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="score" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Top customer intents" subtitle="This week">
          <BarChart data={d.intent_breakdown} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis dataKey="intent" type="category" stroke="var(--muted-foreground)" fontSize={11} width={80} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Knowledge usage" subtitle="Retrievals per source">
          <PieChart>
            <Pie
              data={d.knowledge_usage}
              dataKey="uses"
              nameKey="source"
              outerRadius={90}
              innerRadius={45}
              paddingAngle={2}
            >
              {d.knowledge_usage.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Conversation duration" subtitle="Avg minutes per session">
          <LineChart data={d.duration_series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="minutes" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Sentiment (14d)" subtitle="Weighted average">
          <LineChart data={d.sentiment_series}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} />
            <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[-1, 1]} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="sentiment" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartCard>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = "text-foreground",
}: {
  label: string;
  value: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="surface hover-lift rounded-xl p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-2 text-2xl font-black ${accent}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactElement;
}) {
  return (
    <div className="surface rounded-2xl p-5">
      <div className="mb-3">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
