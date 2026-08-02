import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CollapsibleCardProps {
  icon?: LucideIcon;
  title: string;
  meta?: ReactNode;
  tone?: "default" | "primary" | "success" | "warning" | "danger";
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
}

const toneRing: Record<NonNullable<CollapsibleCardProps["tone"]>, string> = {
  default: "text-muted-foreground bg-accent/50",
  primary: "text-primary bg-primary/10",
  success: "text-success bg-success/10",
  warning: "text-warning bg-warning/10",
  danger: "text-destructive bg-destructive/10",
};

/**
 * Spacious, collapsible content card used across the coaching feed,
 * knowledge panel and escalation panel. Content always wraps and never clips.
 */
export function CollapsibleCard({
  icon: Icon,
  title,
  meta,
  tone = "default",
  defaultOpen = false,
  children,
  className,
}: CollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      className={cn(
        "surface overflow-hidden rounded-2xl transition-colors duration-200",
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent/30"
      >
        {Icon && (
          <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", toneRing[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold tracking-tight">{title}</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {meta}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        </span>
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="wrap-anywhere border-t border-border/70 px-4 py-4 text-sm leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export function NoteList({ items }: { items?: string[] }) {
  if (!items || items.length === 0)
    return <p className="text-xs text-muted-foreground">No notes for this turn.</p>;
  return (
    <ul className="space-y-2.5">
      {items.map((n, i) => (
        <li key={i} className="flex gap-2.5">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
          <span className="wrap-anywhere text-sm leading-relaxed text-foreground/90">{n}</span>
        </li>
      ))}
    </ul>
  );
}

export default CollapsibleCard;
