import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import type { Difficulty, Mode, Persona, SessionConfig } from "@/lib/types";
import { Sparkles, Bot, Users, Play } from "lucide-react";

export const Route = createFileRoute("/app/new-session")({
  head: () => ({ meta: [{ title: "New Session — Clario AI" }] }),
  component: NewSession,
});

const MODES: { value: Mode; label: string; icon: typeof Bot; desc: string }[] = [
  { value: "simulator", label: "Simulator", icon: Bot, desc: "AI generates a customer persona and drives the conversation." },
  { value: "manual", label: "Manual", icon: Users, desc: "Paste live customer messages; we analyze in real time." },
  { value: "replay", label: "Replay", icon: Play, desc: "Upload a past transcript and step through turn by turn." },
];

const PERSONAS: Persona[] = ["Calm", "Angry", "Confused", "Technical", "Impatient", "VIP Customer"];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];

function NewSession() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<SessionConfig>({
    mode: "simulator",
    persona: "Angry",
    scenario: "Refund dispute — order arrived damaged",
    product: "Orbit Wireless Earbuds",
    difficulty: "Hard",
    language: "English",
  });
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const session = await api.startSession(config);
      toast.success("Session created");
      navigate({ to: "/app/console/$sessionId", params: { sessionId: session.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Configure a new session</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your mode, persona, and scenario. Clario spins up all six agents.
        </p>
      </div>

      {/* Mode selector */}
      <div className="grid gap-3 md:grid-cols-3">
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = config.mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => setConfig({ ...config, mode: m.value })}
              className={`surface hover-lift rounded-xl p-4 text-left ${
                active ? "border-primary/60 ring-glow" : ""
              }`}
            >
              <div className="mb-3 grid h-9 w-9 place-items-center rounded-lg bg-brand">
                <Icon className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="font-semibold">{m.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{m.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Form */}
      <div className="surface space-y-5 rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Customer persona</Label>
            <Select
              value={config.persona}
              onValueChange={(v) => setConfig({ ...config, persona: v as Persona })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERSONAS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Difficulty</Label>
            <Select
              value={config.difficulty}
              onValueChange={(v) => setConfig({ ...config, difficulty: v as Difficulty })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Input
              value={config.product}
              onChange={(e) => setConfig({ ...config, product: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Language</Label>
            <Select
              value={config.language}
              onValueChange={(v) => setConfig({ ...config, language: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["English", "Spanish", "French", "German", "Portuguese", "Japanese"].map((l) => (
                  <SelectItem key={l} value={l}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Scenario</Label>
          <Textarea
            rows={3}
            value={config.scenario}
            onChange={(e) => setConfig({ ...config, scenario: e.target.value })}
            placeholder="Describe the situation the AI customer should present…"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => history.back()}>Cancel</Button>
        <Button
          onClick={start}
          disabled={loading}
          className="bg-brand text-primary-foreground hover:opacity-90"
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {loading ? "Starting…" : "Start session"}
        </Button>
      </div>
    </div>
  );
}
