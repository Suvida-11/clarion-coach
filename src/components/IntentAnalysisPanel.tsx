import type { IntentAnalysis, EscalationRisk } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Activity,
  Smile,
  Frown,
  Meh,
  Angry as AngryIcon,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  XAxis,
  Tooltip,
} from "recharts";

export type EmotionKey = "happy" | "neutral" | "confused" | "frustrated" | "angry";

export interface EmotionPoint {
  turn: number;
  emotion: EmotionKey;
  value: number; // -2..2
}

interface Props {
  analysis: IntentAnalysis | null | undefined;
  risk: EscalationRisk | null | undefined;
  emotionTimeline?: EmotionPoint[];
}

const EMOTION_META: Record<EmotionKey, { label: string; icon: typeof Smile; color: string; value: number }> = {
  happy: { label: "Happy", icon: Smile, color: "text-success", value: 2 },
  neutral: { label: "Neutral", icon: Meh, color: "text-muted-foreground", value: 0 },
  confused: { label: "Confused", icon: HelpCircle, color: "text-warning", value: -1 },
  frustrated: { label: "Frustrated", icon: Frown, color: "text-warning", value: -1.5 },
  angry: { label: "Angry", icon: AngryIcon, color: "text-destructive", value: -2 },
};

export function deriveEmotionFromAnalysis(a: IntentAnalysis | null | undefined): EmotionKey {
  if (!a) return "neutral";
  if (a.frustration > 0.75 || a.sentiment === "very_negative") return "angry";
  if (a.frustration > 0.5) return "frustrated";
  if (a.confidence < 0.4) return "confused";
  if (a.sentiment_score > 0.3) return "happy";
  return "neutral";
}

export function AgentEmotionBadge({ emotion }: { emotion: EmotionKey }) {
  const m = EMOTION_META[emotion];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 ${m.color}`}>
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}

export function IntentAnalysisPanel({ analysis, risk, emotionTimeline = [] }: Props) {
  if (!analysis) {
    return (
      <div className="grid h-full place-items-center px-6 py-12 text-center">
        <div className="max-w-xs space-y-2">
          <Brain className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Intent & sentiment</p>
          <p className="text-xs text-muted-foreground">
            Waiting for the first customer turn to run analysis.
          </p>
        </div>
      </div>
    );
  }

  const TrendIcon =
    analysis.satisfaction_trend === "improving"
      ? TrendingUp
      : analysis.satisfaction_trend === "declining"
        ? TrendingDown
        : Minus;
  const trendTone =
    analysis.satisfaction_trend === "improving"
      ? "text-success"
      : analysis.satisfaction_trend === "declining"
        ? "text-destructive"
        : "text-muted-foreground";

  const currentEmotion = deriveEmotionFromAnalysis(analysis);

  return (
    <div className="space-y-4">
      {/* Intents */}
      <div className="grid grid-cols-2 gap-2">
        <InfoTile
          icon={Target}
          label="Primary intent"
          value={analysis.intent}
          accent="text-primary"
        />
        <InfoTile
          icon={Sparkles}
          label="Secondary intent"
          value={analysis.secondary_intent || "—"}
          accent="text-chart-2"
        />
      </div>

      {/* Sentiment + confidence + emotion */}
      <div className="grid grid-cols-3 gap-2">
        <InfoTile
          label="Sentiment"
          value={analysis.sentiment.replace("_", " ")}
          accent={
            analysis.sentiment_score > 0
              ? "text-success"
              : analysis.sentiment_score < -0.3
                ? "text-destructive"
                : "text-warning"
          }
        />
        <InfoTile
          label="Confidence"
          value={`${(analysis.confidence * 100).toFixed(0)}%`}
        />
        <InfoTile label="Emotion" value={EMOTION_META[currentEmotion].label} accent={EMOTION_META[currentEmotion].color} />
      </div>

      {/* Bars */}
      <div className="space-y-2">
        <Bar label="Frustration level" value={analysis.frustration} tone="destructive" />
        <Bar label="Urgency" value={analysis.urgency} tone="warning" />
        <Bar label="Confidence score" value={analysis.confidence} tone="primary" />
      </div>

      <Separator />

      {/* Satisfaction trend */}
      <div className="glass flex items-center justify-between rounded-lg p-3">
        <div className="min-w-0">
          <div className="text-[10px] font-medium uppercase text-muted-foreground">
            Satisfaction trend
          </div>
          <div className={`mt-0.5 flex items-center gap-1.5 text-sm font-semibold capitalize ${trendTone}`}>
            <TrendIcon className="h-4 w-4" />
            {analysis.satisfaction_trend}
          </div>
        </div>
        {risk && (
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase text-muted-foreground">
              Escalation risk
            </div>
            <Badge
              variant={risk.level === "high" || risk.level === "critical" ? "destructive" : "secondary"}
              className="mt-0.5 gap-1"
            >
              <AlertTriangle className="h-3 w-3" />
              {risk.level.toUpperCase()} · {(risk.probability * 100).toFixed(0)}%
            </Badge>
          </div>
        )}
      </div>

      {/* Emotion timeline */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground">
            <Activity className="h-3 w-3" /> Emotion timeline
          </h4>
          <span className="text-[10px] text-muted-foreground">
            {emotionTimeline.length} turns
          </span>
        </div>
        <div className="glass h-24 rounded-lg p-2">
          {emotionTimeline.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={emotionTimeline}>
                <XAxis dataKey="turn" hide />
                <YAxis domain={[-2, 2]} hide />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(_v, _n, item) => [
                    EMOTION_META[(item.payload as EmotionPoint).emotion].label,
                    "Emotion",
                  ]}
                  labelFormatter={(l) => `Turn ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: "var(--chart-1)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-full place-items-center text-[11px] text-muted-foreground">
              Timeline appears after 2+ turns
            </div>
          )}
        </div>
      </div>

      {/* Conversation summary */}
      {analysis.conversation_summary && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Conversation summary
          </h4>
          <div className="glass rounded-lg p-3 text-xs leading-relaxed text-muted-foreground">
            {analysis.conversation_summary}
          </div>
        </div>
      )}

      {risk?.reasoning && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Risk reasoning
          </h4>
          <div className="glass rounded-lg p-3 text-xs leading-relaxed">{risk.reasoning}</div>
        </div>
      )}
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  accent = "text-foreground",
}: {
  icon?: typeof Target;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="glass rounded-lg p-2.5">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase text-muted-foreground">
        {Icon && <Icon className="h-3 w-3" />}
        {label}
      </div>
      <div className={`mt-1 truncate text-sm font-semibold capitalize ${accent}`} title={value}>
        {value}
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "destructive" | "warning" | "primary";
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const toneClass =
    tone === "destructive"
      ? "[&>div]:bg-destructive"
      : tone === "warning"
        ? "[&>div]:bg-warning"
        : "[&>div]:bg-primary";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold">{pct.toFixed(0)}%</span>
      </div>
      <Progress value={pct} className={`h-1.5 ${toneClass}`} />
    </div>
  );
}
