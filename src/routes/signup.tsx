import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AuthShell } from "./login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { setCurrentUser } from "@/lib/user";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account — Clario AI" },
      { name: "description", content: "Create your Clario AI coaching workspace." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fn, setFn] = useState("");
  const [ln, setLn] = useState("");
  const [email, setEmail] = useState("");
  return (
    <AuthShell title="Create your workspace" subtitle="Start coaching your team in minutes.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          const name = `${fn.trim()} ${ln.trim()}`.trim();
          if (name) setCurrentUser({ name, email: email.trim() || undefined });
          setTimeout(() => {
            toast.success(`Welcome, ${fn.trim() || "aboard"}`);
            navigate({ to: "/app" });
          }, 500);
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="fn">First name</Label>
            <Input id="fn" required placeholder="Maya" value={fn} onChange={(e) => setFn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ln">Last name</Label>
            <Input id="ln" required placeholder="Kensington" value={ln} onChange={(e) => setLn(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" required placeholder="8+ characters" />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-primary-foreground hover:opacity-90"
        >
          {loading ? "Creating…" : "Create workspace"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}
