import { Sparkles } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand ring-glow">
        <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <span className="text-lg font-black tracking-tight">
        Clario<span className="text-gradient">.ai</span>
      </span>
    </div>
  );
}
