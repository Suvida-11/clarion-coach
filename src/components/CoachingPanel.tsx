import type { CoachingSuggestion, EscalationRisk } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles,
  Heart,
  Type as TypeIcon,
  ThumbsUp,
  Award,
  ArrowRight,
  Wrench,
  ShieldAlert,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  coaching: CoachingSuggestion | null | undefined;
  risk?: EscalationRisk | null;
  onUseSuggestion?: (text: string) => void;
}

export function CoachingPanel({ coaching, risk, onUseSuggestion }: Props) {
  if (!coaching) {
    return (
      <div className="grid h-full place-items-center px-6 py-12 text-center">
        <div className="max-w-xs space-y-2">
          <Sparkles className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">AI Coaching</p>
          <p className="text-xs text-muted-foreground">
            Send a message to receive real-time coaching guidance.
          </p>
        </div>
      </div>
    );
  }

  const empathyTip = coaching.empathy_tip || coaching.empathy_notes?.[0];
  const toneTip = coaching.tone_improvement || coaching.tone_notes?.[0];
  const escalationTip =
    coaching.escalation_recommendation ||
    (risk && (risk.level === "high" || risk.level === "critical")
      ? risk.recommended_action
      : undefined);

  return (
    <div className="space-y-4">
      {/* Suggested response */}
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
          <Sparkles className="h-3 w-3 text-primary" /> Suggested response
        </h4>
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm leading-relaxed">
          {coaching.suggested_response}
        </div>
        {onUseSuggestion && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 h-7 w-full text-xs"
            onClick={() => onUseSuggestion(coaching.suggested_response)}
          >
            Use this response
          </Button>
        )}
      </div>

      <Separator />

      {/* Quick tips grid */}
      <div className="grid gap-2">
        {empathyTip && <TipCard icon={Heart} label="Empathy tip" tone="pink" body={empathyTip} />}
        {toneTip && <TipCard icon={TypeIcon} label="Tone improvement" tone="blue" body={toneTip} />}
        {coaching.next_best_action && (
          <TipCard
            icon={ArrowRight}
            label="Next best action"
            tone="green"
            body={coaching.next_best_action}
          />
        )}
        {coaching.troubleshooting_recommendation && (
          <TipCard
            icon={Wrench}
            label="Troubleshooting"
            tone="amber"
            body={coaching.troubleshooting_recommendation}
          />
        )}
        {escalationTip && (
          <TipCard
            icon={ShieldAlert}
            label="Escalation recommendation"
            tone="red"
            body={escalationTip}
          />
        )}
      </div>

      {/* Detail sections */}
      {(coaching.tone_notes?.length ||
        coaching.empathy_notes?.length ||
        coaching.grammar_notes?.length ||
        coaching.professional_notes?.length) && <Separator />}

      <CoachSection icon={TypeIcon} label="Tone" items={coaching.tone_notes} />
      <CoachSection icon={Heart} label="Empathy" items={coaching.empathy_notes} />
      <CoachSection icon={ThumbsUp} label="Grammar" items={coaching.grammar_notes} />
      <CoachSection icon={Award} label="Professionalism" items={coaching.professional_notes} />
    </div>
  );
}

function TipCard({
  icon: Icon,
  label,
  body,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  body: string;
  tone: "pink" | "blue" | "green" | "amber" | "red";
}) {
  const tones: Record<typeof tone, string> = {
    pink: "border-pink-500/30 bg-pink-500/5 text-pink-400",
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
    green: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    red: "border-red-500/30 bg-red-500/5 text-red-400",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-foreground/90">{body}</p>
    </div>
  );
}

function CoachSection({
  icon: Icon,
  label,
  items,
}: {
  icon: LucideIcon;
  label: string;
  items?: string[];
}) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </h4>
      <ul className="space-y-1">
        {items.map((n, i) => (
          <li key={i} className="flex gap-2 text-xs text-muted-foreground">
            <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-primary/70" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
