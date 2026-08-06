import type { CoachingSuggestion, EscalationRisk } from "@/lib/types";
import { CollapsibleCard, NoteList } from "@/components/panels/collapsible-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Heart,
  Type as TypeIcon,
  SpellCheck,
  Eye,
  Award,
  Lightbulb,
  Gauge,
  MessageSquareQuote,
  ArrowRight,
  Wrench,
  ShieldAlert,
} from "lucide-react";

interface Props {
  coaching: CoachingSuggestion | null | undefined;
  risk?: EscalationRisk | null;
  onUseSuggestion?: (text: string) => void;
}

function scoreTone(score: number) {
  if (score >= 80) return { text: "text-success", bar: "bg-success", label: "Excellent" };
  if (score >= 60) return { text: "text-primary", bar: "bg-primary", label: "Good" };
  if (score >= 40) return { text: "text-warning", bar: "bg-warning", label: "Needs work" };
  return { text: "text-destructive", bar: "bg-destructive", label: "Critical" };
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value <= 1 ? value * 100 : value));
  const tone = scoreTone(pct);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate font-medium capitalize leading-tight text-muted-foreground">
          {label}
        </span>
        <span className={`shrink-0 font-mono font-semibold ${tone.text}`}>{Math.round(pct)}</span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent/60">
        <div
          className={`h-full rounded-full ${tone.bar} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Live Coaching Feed — one collapsible card per coaching dimension so long
 * Gemini responses always wrap and stay readable.
 */
export function CoachingFeed({ coaching, risk, onUseSuggestion }: Props) {
  if (!coaching) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <div className="max-w-xs space-y-3">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/60">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="text-sm font-semibold">Live coaching feed</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Send a message to receive real-time coaching from the Coaching Agent.
          </p>
        </div>
      </div>
    );
  }

  const scores = coaching.scores;
  const overall = coaching.coaching_score ?? 0;
  const overallPct = overall <= 1 ? overall * 100 : overall;
  const tone = scoreTone(overallPct);
  const escalationTip =
    coaching.escalation_recommendation ||
    (risk && (risk.level === "high" || risk.level === "critical")
      ? risk.recommended_action
      : undefined);

  return (
    <div className="space-y-4">
      {/* Coaching score */}
      <div className="surface rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
              <Gauge className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Coaching score
              </div>
              <div className={`text-3xl font-black leading-none tracking-tight ${tone.text}`}>
                {Math.round(overallPct)}
                <span className="text-base font-semibold text-muted-foreground">/100</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className={tone.text}>
            {tone.label}
          </Badge>
        </div>
        {scores && (
          <div className="mt-5 grid gap-x-5 gap-y-3.5 sm:grid-cols-2">
            <ScoreBar label="tone" value={scores.tone} />
            <ScoreBar label="empathy" value={scores.empathy} />
            <ScoreBar label="grammar" value={scores.grammar} />
            <ScoreBar label="clarity" value={scores.clarity} />
            <ScoreBar label="professionalism" value={scores.professionalism} />
            {typeof scores.knowledge_grounding === "number" && (
              <ScoreBar label="knowledge grounding" value={scores.knowledge_grounding} />
            )}
            {typeof scores.resolution_quality === "number" && (
              <ScoreBar label="resolution quality" value={scores.resolution_quality} />
            )}
          </div>
        )}

      </div>

      {/* AI Draft Response — a real, sendable customer reply (not coaching) */}
      <div className="rounded-2xl border border-primary/25 bg-primary/[0.04] p-5 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand text-primary-foreground">
              <MessageSquareQuote className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight">AI Draft Response</div>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Ready to send to the customer — review, edit, then reply.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 gap-1.5"
            onClick={() => {
              void navigator.clipboard
                ?.writeText(coaching.suggested_response)
                .then(() => setCopied(true))
                .catch(() => setCopied(false));
            }}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-relaxed text-foreground/95">
            {coaching.suggested_response}
          </p>
        </div>
        {onUseSuggestion && (
          <Button
            size="sm"
            className="mt-4 w-full bg-brand text-primary-foreground hover:opacity-90"
            onClick={() => onUseSuggestion(coaching.suggested_response)}
          >
            Use this reply
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Award className="h-3.5 w-3.5" />
        Coaching analysis
      </div>


      <CollapsibleCard icon={TypeIcon} title="Tone analysis" tone="primary">
        <NoteList items={[coaching.tone_improvement, ...(coaching.tone_notes ?? [])].filter(Boolean) as string[]} />
      </CollapsibleCard>

      <CollapsibleCard icon={SpellCheck} title="Grammar notes">
        <NoteList items={coaching.grammar_notes} />
      </CollapsibleCard>

      <CollapsibleCard icon={Eye} title="Clarity notes">
        <NoteList items={coaching.clarity_notes} />
      </CollapsibleCard>

      <CollapsibleCard icon={Heart} title="Empathy notes" tone="danger">
        <NoteList items={[coaching.empathy_tip, ...(coaching.empathy_notes ?? [])].filter(Boolean) as string[]} />
      </CollapsibleCard>

      <CollapsibleCard icon={Award} title="Professional suggestions" tone="success">
        <NoteList items={coaching.professional_notes} />
      </CollapsibleCard>

      <CollapsibleCard icon={Lightbulb} title="Communication improvement tips" tone="warning">
        <NoteList items={coaching.improvement_tips} />
      </CollapsibleCard>

      {(coaching.next_best_action ||
        coaching.troubleshooting_recommendation ||
        escalationTip) && (
        <CollapsibleCard icon={ArrowRight} title="Next steps" tone="success">
          <div className="space-y-4">
            {coaching.next_best_action && (
              <Item icon={ArrowRight} label="Next best action" body={coaching.next_best_action} />
            )}
            {coaching.troubleshooting_recommendation && (
              <Item
                icon={Wrench}
                label="Troubleshooting"
                body={coaching.troubleshooting_recommendation}
              />
            )}
            {escalationTip && (
              <Item icon={ShieldAlert} label="Escalation" body={escalationTip} />
            )}
          </div>
        </CollapsibleCard>
      )}

      {coaching.score_reasoning && (
        <CollapsibleCard icon={Sparkles} title="Score reasoning">
          <p className="wrap-anywhere whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {coaching.score_reasoning}
          </p>
        </CollapsibleCard>
      )}
    </div>
  );
}

function Item({
  icon: Icon,
  label,
  body,
}: {
  icon: typeof ArrowRight;
  label: string;
  body: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="wrap-anywhere text-sm leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}

export default CoachingFeed;
