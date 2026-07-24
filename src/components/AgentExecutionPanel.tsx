import { useState } from "react";
import type { AgentTraceEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  Bot,
  Brain,
  BookOpen,
  Sparkles,
  ArrowDown,
  MinusCircle,
} from "lucide-react";
import { format } from "date-fns";

const AGENT_META: Record<string, { icon: typeof Bot; tint: string }> = {
  "Customer Simulator Agent": { icon: Bot, tint: "text-purple-400" },
  "Intent Detection Agent": { icon: Brain, tint: "text-blue-400" },
  "Knowledge Recommendation Agent": { icon: BookOpen, tint: "text-emerald-400" },
  "Coaching Agent": { icon: Sparkles, tint: "text-amber-400" },
};

function StatusIcon({ status }: { status: AgentTraceEntry["status"] }) {
  if (status === "Completed")
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "Running")
    return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "Failed")
    return <XCircle className="h-4 w-4 text-destructive" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

function DetailRow({ k, v }: { k: string; v: unknown }) {
  const label = k.replace(/_/g, " ");
  let rendered: React.ReactNode;
  if (v == null || v === "") return null;
  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    rendered = (
      <ul className="mt-1 space-y-1">
        {v.map((item, i) => (
          <li key={i} className="rounded bg-background/40 px-2 py-1 text-xs">
            {typeof item === "object" ? (
              <pre className="whitespace-pre-wrap font-mono text-[10px]">
                {JSON.stringify(item, null, 2)}
              </pre>
            ) : (
              String(item)
            )}
          </li>
        ))}
      </ul>
    );
  } else if (typeof v === "object") {
    rendered = (
      <pre className="mt-1 whitespace-pre-wrap rounded bg-background/40 px-2 py-1 font-mono text-[10px]">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  } else if (typeof v === "number") {
    rendered = <span className="font-mono text-xs">{v.toFixed(3)}</span>;
  } else {
    rendered = <span className="text-xs text-foreground/90">{String(v)}</span>;
  }
  return (
    <div className="border-t border-border/50 py-2 first:border-t-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div>{rendered}</div>
    </div>
  );
}

function AgentCard({ entry }: { entry: AgentTraceEntry }) {
  const [open, setOpen] = useState(false);
  const meta = AGENT_META[entry.agent] ?? { icon: Bot, tint: "text-primary" };
  const Icon = meta.icon;
  const details = entry.details ?? {};
  const hasDetails = Object.keys(details).length > 0;

  return (
    <div className="glass overflow-hidden rounded-lg">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-accent/30"
        disabled={!hasDetails}
      >
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-md bg-accent ${meta.tint}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusIcon status={entry.status} />
            <span className="truncate text-sm font-semibold">{entry.agent}</span>
          </div>
          {entry.summary && (
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {entry.summary}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge variant="outline" className="font-mono text-[10px]">
            {entry.execution_time}
          </Badge>
          {entry.timestamp && (
            <span className="font-mono text-[9px] text-muted-foreground">
              {(() => {
                try {
                  return format(new Date(entry.timestamp), "HH:mm:ss");
                } catch {
                  return "";
                }
              })()}
            </span>
          )}
        </div>
        {hasDetails ? (
          open ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )
        ) : null}
      </button>
      {open && hasDetails && (
        <div className="border-t border-border bg-background/30 px-3 py-2">
          {Object.entries(details).map(([k, v]) => (
            <DetailRow key={k} k={k} v={v} />
          ))}
        </div>
      )}
    </div>
  );
}

export interface AgentExecutionPanelProps {
  trace?: AgentTraceEntry[];
  className?: string;
}

export function AgentExecutionPanel({ trace, className }: AgentExecutionPanelProps) {
  const entries = trace ?? [];
  return (
    <section className={`surface flex min-h-0 flex-col rounded-2xl ${className ?? ""}`}>
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">AI Agent Pipeline</h3>
        </div>
        <span className="text-xs text-muted-foreground">
          {entries.length} agent{entries.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {entries.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-accent">
              <Bot className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="font-medium">No agents executed yet</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Send a message to see the AI agent pipeline in action.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((e, i) => (
              <div key={`${e.agent}-${i}`}>
                <AgentCard entry={e} />
                {i < entries.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown className="h-3 w-3 text-muted-foreground/60" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default AgentExecutionPanel;
