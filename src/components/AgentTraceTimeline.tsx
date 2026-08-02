import { useState } from "react";
import type { AgentTraceEntry } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  Bot,
  Brain,
  BookOpen,
  Sparkles,
  ShieldAlert,
  MinusCircle,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const AGENT_META: Record<string, { icon: LucideIcon; tint: string }> = {
  "Customer Simulator Agent": { icon: Bot, tint: "text-purple-400 bg-purple-500/10" },
  "Intent Detection Agent": { icon: Brain, tint: "text-blue-400 bg-blue-500/10" },
  "Intent & Sentiment Agent": { icon: Brain, tint: "text-blue-400 bg-blue-500/10" },
  "Knowledge Recommendation Agent": { icon: BookOpen, tint: "text-emerald-400 bg-emerald-500/10" },
  "Coaching Agent": { icon: Sparkles, tint: "text-amber-400 bg-amber-500/10" },
  "Escalation Monitor Agent": { icon: ShieldAlert, tint: "text-red-400 bg-red-500/10" },
};

function StatusIcon({ status }: { status: AgentTraceEntry["status"] }) {
  if (status === "Completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "Running") return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
  if (status === "Failed") return <XCircle className="h-4 w-4 text-destructive" />;
  return <MinusCircle className="h-4 w-4 text-muted-foreground" />;
}

function DetailRow({ k, v }: { k: string; v: unknown }) {
  if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return null;
  const label = k.replace(/_/g, " ");
  let rendered: React.ReactNode;
  if (Array.isArray(v)) {
    rendered = (
      <ul className="mt-1.5 space-y-1.5">
        {v.map((item, i) => (
          <li key={i} className="wrap-anywhere rounded-lg bg-background/50 px-2.5 py-1.5 text-xs leading-relaxed">
            {typeof item === "object" ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    );
  } else if (typeof v === "object") {
    rendered = (
      <pre className="wrap-anywhere mt-1.5 whitespace-pre-wrap rounded-lg bg-background/50 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed">
        {JSON.stringify(v, null, 2)}
      </pre>
    );
  } else if (typeof v === "number") {
    rendered = <span className="font-mono text-xs">{Number.isInteger(v) ? v : v.toFixed(3)}</span>;
  } else {
    rendered = (
      <span className="wrap-anywhere text-xs leading-relaxed text-foreground/90">{String(v)}</span>
    );
  }
  return (
    <div className="border-t border-border/60 py-2.5 first:border-t-0 first:pt-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div>{rendered}</div>
    </div>
  );
}

function TraceNode({ entry, isLast }: { entry: AgentTraceEntry; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = AGENT_META[entry.agent] ?? { icon: Bot, tint: "text-primary bg-primary/10" };
  const Icon = meta.icon;
  const details = entry.details ?? {};
  const hasDetails = Object.keys(details).length > 0;

  return (
    <div className="relative pb-4 pl-14 last:pb-0">
      {/* connector */}
      {!isLast && (
        <span className="absolute left-[19px] top-11 bottom-0 w-px bg-gradient-to-b from-border to-transparent" />
      )}
      <span
        className={cn(
          "absolute left-0 top-1.5 grid h-10 w-10 place-items-center rounded-xl ring-1 ring-border",
          meta.tint,
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div className="surface overflow-hidden rounded-2xl">
        <button
          type="button"
          onClick={() => hasDetails && setOpen((o) => !o)}
          disabled={!hasDetails}
          aria-expanded={open}
          className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30 disabled:cursor-default"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusIcon status={entry.status} />
              <span className="text-sm font-semibold tracking-tight">{entry.agent}</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {entry.execution_time}
              </Badge>
              {entry.timestamp && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {(() => {
                    try {
                      return format(new Date(entry.timestamp), "HH:mm:ss");
                    } catch {
                      return entry.timestamp;
                    }
                  })()}
                </span>
              )}
            </div>
            {entry.summary && (
              <p className="wrap-anywhere mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {entry.summary}
              </p>
            )}
          </div>
          {hasDetails && (
            <ChevronDown
              className={cn(
                "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                open && "rotate-180",
              )}
            />
          )}
        </button>
        {open && hasDetails && (
          <div className="border-t border-border/70 bg-background/30 px-4 py-3">
            {Object.entries(details).map(([k, v]) => (
              <DetailRow key={k} k={k} v={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export interface AgentTraceTimelineProps {
  trace?: AgentTraceEntry[];
  className?: string;
}

/** Vertical execution timeline for the agent pipeline. */
export function AgentTraceTimeline({ trace, className }: AgentTraceTimelineProps) {
  const entries = trace ?? [];
  if (entries.length === 0) {
    return (
      <div
        className={cn(
          "grid place-items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center",
          className,
        )}
      >
        <div className="max-w-xs space-y-3">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/60">
            <Bot className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="text-sm font-semibold">No agents executed yet</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Send a message to watch the pipeline run end to end.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={cn("relative", className)}>
      {entries.map((e, i) => (
        <TraceNode key={`${e.agent}-${i}`} entry={e} isLast={i === entries.length - 1} />
      ))}
    </div>
  );
}

export default AgentTraceTimeline;
