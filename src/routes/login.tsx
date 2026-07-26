import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState } from "react";
import { setCurrentUser } from "@/lib/user";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Clario AI" },
      { name: "description", content: "Sign in to your Clario AI coaching workspace." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Clario workspace.">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLoading(true);
          setTimeout(() => {
            toast.success("Signed in");
            navigate({ to: "/app" });
          }, 500);
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" required placeholder="you@company.com" />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot?
            </Link>
          </div>
          <Input id="password" type="password" required placeholder="••••••••" />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-brand text-primary-foreground hover:opacity-90"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen">
      <div className="grid-bg absolute inset-0 opacity-30" />
      <div className="absolute -left-40 top-40 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[140px]" />
      <div className="relative m-auto w-full max-w-md px-6 py-10">
        <Link to="/" className="mb-8 inline-block">
          <Logo />
        </Link>
        <div className="glass rounded-2xl p-8">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
