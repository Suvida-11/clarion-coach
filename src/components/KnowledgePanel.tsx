import { useState } from "react";
import type { RetrievedChunk } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, FileText, Tag, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function KnowledgePanel({ chunks }: { chunks: RetrievedChunk[] }) {
  if (!chunks || chunks.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
        <div className="max-w-xs space-y-3">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/60">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
          </span>
          <p className="text-sm font-semibold">Knowledge recommendations</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            The Knowledge Recommendation Agent retrieves the most relevant articles for every
            message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        Top {chunks.length} matches · retrieved via RAG
      </div>
      {chunks.map((c, i) => (
        <KnowledgeCard key={c.id} chunk={c} rank={i + 1} defaultOpen={i === 0} />
      ))}
    </div>
  );
}

function KnowledgeCard({
  chunk,
  rank,
  defaultOpen,
}: {
  chunk: RetrievedChunk;
  rank: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const similarity = Math.round(chunk.similarity * 100);
  const simTone =
    similarity >= 80 ? "text-success" : similarity >= 60 ? "text-primary" : "text-warning";
  const simBar = similarity >= 80 ? "bg-success" : similarity >= 60 ? "bg-primary" : "bg-warning";

  return (
    <article className="surface overflow-hidden rounded-2xl">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-accent/30"
      >
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-xs font-bold text-primary">
          {rank}
        </span>
        <span className="min-w-0 flex-1">
          <span className="wrap-anywhere block text-sm font-semibold leading-snug">
            {chunk.title}
          </span>
          <span className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Tag className="h-2.5 w-2.5" />
              {chunk.type}
            </Badge>
            <span className={cn("font-mono text-[11px] font-semibold", simTone)}>
              {similarity}% match
            </span>
          </span>
          <span className="mt-2.5 block h-1 w-full overflow-hidden rounded-full bg-accent/60">
            <span
              className={cn("block h-full rounded-full transition-all duration-500", simBar)}
              style={{ width: `${similarity}%` }}
            />
          </span>
        </span>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border/70 px-4 py-4">
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileText className="h-3 w-3" />
              Preview
            </div>
            <p className="wrap-anywhere max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {chunk.preview}
            </p>
          </div>
          <div className="flex items-center gap-1.5 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
            <Link2 className="h-3 w-3 shrink-0" />
            <span className="wrap-anywhere font-mono">{chunk.source}</span>
          </div>
        </div>
      )}
    </article>
  );
}

export default KnowledgePanel;
