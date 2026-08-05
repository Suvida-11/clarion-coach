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
import type { Difficulty, Persona, SessionConfig } from "@/lib/types";
import { Sparkles, Bot } from "lucide-react";

export const Route = createFileRoute("/app/new-session")({
  head: () => ({ meta: [{ title: "New Session — Clario AI" }] }),
  component: NewSession,
});

const PERSONAS: Persona[] = [
  "Angry",
  "Frustrated",
  "Impatient",
  "Calm",
  "Polite",
  "Confused",
  "Beginner",
  "Technical User",
  "Developer",
  "VIP Customer",
  "Business Owner",
  "Student",
  "Senior Citizen",
  "First-Time Buyer",
  "Healthcare Customer",
  "Returning Customer",
];
const DIFFICULTIES: Difficulty[] = ["Easy", "Medium", "Hard", "Expert"];
const SCENARIO_PRESETS = [
  "Login Issue",
  "Password Reset",
  "Payment Failure",
  "Subscription Cancellation",
  "Refund Request",
  "Product Information",
  "Order Delay",
  "Technical Support",
  "Damaged Product",
  "Billing Issue",
  "Order Tracking",
  "VIP Complaint",
];

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
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Start a live session</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Configure the AI customer — persona, issue, product and difficulty — and Clarion Coach
          spins up the full agent pipeline for a live simulated conversation.
        </p>
      </div>

      <div className="surface flex items-start gap-3 rounded-xl p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand">
          <Bot className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="min-w-0 text-sm">
          <div className="font-semibold">Simulator mode</div>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            New sessions are always live simulations. Use{" "}
            <span className="font-medium text-foreground">Manual Mode</span> to analyse pasted
            customer messages, or <span className="font-medium text-foreground">Replay Mode</span> to
            step through an uploaded transcript.
          </p>
        </div>
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
          <div className="flex flex-wrap gap-1.5">
            {SCENARIO_PRESETS.map((s) => {
              const active = config.scenario === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConfig({ ...config, scenario: s })}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-accent"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
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
