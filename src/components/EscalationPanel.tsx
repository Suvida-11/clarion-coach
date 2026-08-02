import type { EscalationRisk } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, ShieldCheck, Repeat, Activity } from "lucide-react";
import { CollapsibleCard } from "@/components/panels/collapsible-card";

const LEVELS: Record<
  EscalationRisk["level"],
  { label: string; text: string; bg: string; border: string; bar: string }
> = {
  low: {
    label: "Low",
    text: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
    bar: "bg-success",
  },
  medium: {
    label: "Medium",
    text: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
    bar: "bg-warning",
  },
  high: {
    label: "High",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    bar: "bg-orange-500",
  },
  critical: {
    label: "Critical",
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    bar: "bg-destructive",
  },
};

export function EscalationBanner({ risk }: { risk?: EscalationRisk | null }) {
  if (!risk || (risk.level !== "high" && risk.level !== "critical")) return null;
  const tone = LEVELS[risk.level];
  return (
    <div
      className={`animate-in-up flex items-start gap-3.5 rounded-2xl border p-4 ${tone.border} ${tone.bg}`}
    >
      <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${tone.text}`} />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${tone.text}`}>
          ⚠ {tone.label} escalation risk
        </div>
        <p className="wrap-anywhere mt-1 text-sm leading-relaxed text-foreground/90">
          Consider escalating this conversation to a senior support specialist.
        </p>
      </div>
      <Badge variant="outline" className={`shrink-0 font-mono ${tone.text}`}>
        {Math.round(risk.probability * 100)}%
      </Badge>
    </div>
  );
}

export function EscalationPanel({ risk }: { risk?: EscalationRisk | null }) {
  if (!risk) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <div className="max-w-xs space-y-3">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/60">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="text-sm font-semibold">Escalation monitor</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Risk is evaluated automatically after every turn.
          </p>
        </div>
      </div>
    );
  }

  const tone = LEVELS[risk.level];
  const pct = Math.round(risk.probability * 100);

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border p-5 ${tone.border} ${tone.bg}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl bg-background/40 ${tone.text}`}>
              <ShieldAlert className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Escalation probability
              </div>
              <div className={`text-3xl font-black leading-none tracking-tight ${tone.text}`}>
                {pct}%
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 ${tone.text}`}>
            {tone.label} risk
          </Badge>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background/50">
          <div
            className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Repeat className="h-3.5 w-3.5" />
            {risk.repeated_complaints ?? 0} repeated complaints
          </span>
          <span className="flex items-center gap-1.5 capitalize">
            <Activity className="h-3.5 w-3.5" />
            {(risk.resolution_status ?? "unresolved").replace("_", " ")}
          </span>
        </div>
      </div>

      <CollapsibleCard icon={ShieldAlert} title="Reasoning" tone="warning" defaultOpen>
        <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {risk.reasoning || "No reasoning provided."}
        </p>
      </CollapsibleCard>

      <CollapsibleCard icon={ShieldCheck} title="Recommended action" tone="success" defaultOpen>
        <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {risk.recommended_action || "Continue monitoring the conversation."}
        </p>
      </CollapsibleCard>

      {risk.signals && risk.signals.length > 0 && (
        <CollapsibleCard icon={Activity} title={`Signals (${risk.signals.length})`}>
          <div className="flex flex-wrap gap-2">
            {risk.signals.map((s, i) => (
              <Badge key={i} variant="secondary" className="wrap-anywhere max-w-full text-xs">
                {s}
              </Badge>
            ))}
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}

export default EscalationPanel;
