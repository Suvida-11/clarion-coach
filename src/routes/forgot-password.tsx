import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell } from "./login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — Clario AI" },
      { name: "description", content: "Reset your Clario AI password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="We'll email you a link to set a new one."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          toast.success("If that email exists, a reset link is on its way.");
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required placeholder="you@company.com" />
        </div>
        <Button type="submit" className="w-full bg-brand text-primary-foreground hover:opacity-90">
          Send reset link
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
