import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";
import type { Settings } from "@/lib/types";
import { toast } from "sonner";
import { Key, Bell, Globe, Palette } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Clario AI" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const q = useQuery({ queryKey: ["settings"], queryFn: api.settings });
  const [local, setLocal] = useState<Settings | null>(null);
  const [apiKey, setApiKey] = useState("");

  useEffect(() => {
    if (q.data && !local) setLocal(q.data);
  }, [q.data, local]);

  async function save() {
    if (!local) return;
    await api.saveSettings(local);
    toast.success("Settings saved");
  }

  if (!local) return <Skeleton className="mx-auto h-96 max-w-3xl" />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your workspace configuration.
        </p>
      </div>

      <Section icon={Key} title="Gemini API Key" desc="Used by all AI agents.">
        <div className="space-y-2">
          <Label>Current key</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={local.gemini_api_key_masked}
              className="font-mono"
            />
          </div>
          <Label className="pt-2">Rotate key</Label>
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
            />
            <Button
              onClick={() => {
                if (!apiKey) return;
                setLocal({
                  ...local,
                  gemini_api_key_masked: "••••••••••••" + apiKey.slice(-4),
                });
                setApiKey("");
                toast.success("Key rotated");
              }}
            >
              Rotate
            </Button>
          </div>
        </div>
      </Section>

      <Section icon={Palette} title="Theme" desc="Choose light, dark, or system default.">
        <Select
          value={local.theme}
          onValueChange={(v) => setLocal({ ...local, theme: v as Settings["theme"] })}
        >
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="dark">Dark</SelectItem>
            <SelectItem value="light">Light</SelectItem>
            <SelectItem value="system">System</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section icon={Globe} title="Language" desc="Interface language.">
        <Select
          value={local.language}
          onValueChange={(v) => setLocal({ ...local, language: v })}
        >
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["English", "Spanish", "French", "German", "Portuguese", "Japanese"].map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Section>

      <Section icon={Bell} title="Notifications" desc="Choose what to be notified about.">
        <div className="space-y-3">
          {(
            [
              ["escalation_alerts", "Escalation alerts", "High-risk turn detected"],
              ["session_summaries", "Session summaries", "Post-interaction reports"],
              ["weekly_digest", "Weekly digest", "Roll-up of team performance"],
            ] as const
          ).map(([key, label, desc]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
              <Switch
                checked={local.notifications[key]}
                onCheckedChange={(v) =>
                  setLocal({
                    ...local,
                    notifications: { ...local.notifications, [key]: v },
                  })
                }
              />
            </div>
          ))}
        </div>
      </Section>

      <div className="flex justify-end">
        <Button
          onClick={save}
          className="bg-brand text-primary-foreground hover:opacity-90"
        >
          Save changes
        </Button>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  desc,
  children,
}: {
  icon: typeof Key;
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface rounded-2xl p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
