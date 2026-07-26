import { useState } from "react";
import type { RetrievedChunk } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, Sparkles } from "lucide-react";

export function KnowledgePanel({ chunks }: { chunks: RetrievedChunk[] }) {
  if (!chunks || chunks.length === 0) {
    return (
      <div className="grid h-full place-items-center px-6 py-12 text-center">
        <div className="max-w-xs space-y-2">
          <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-sm font-medium">Knowledge base</p>
          <p className="text-xs text-muted-foreground">
            RAG retrieves the most relevant articles for each message.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        Top {chunks.length} matches · retrieved via RAG
      </div>
      {chunks.map((c, i) => (
        <KnowledgeArticle key={c.id} chunk={c} rank={i + 1} defaultOpen={i === 0} />
      ))}
    </div>
  );
}

function KnowledgeArticle({
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
  const summary = chunk.preview.length > 140 ? chunk.preview.slice(0, 140) + "…" : chunk.preview;

  const simTone =
    similarity >= 80 ? "text-success" : similarity >= 60 ? "text-primary" : "text-warning";

  return (
    <div className="glass hover-lift rounded-lg">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-start gap-2 p-3 text-left"
      >
        <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-primary/15 text-[10px] font-bold text-primary">
          {rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="outline" className="h-4 px-1 text-[9px]">
              {chunk.type}
            </Badge>
            <span className={`text-[11px] font-mono font-semibold ${simTone}`}>
              {similarity}%
            </span>
          </div>
          <div className="truncate text-sm font-semibold">{chunk.title}</div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{summary}</p>
        </div>
        {open ? (
          <ChevronDown className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="space-y-2 border-t border-border/60 px-3 py-3 text-xs">
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase text-muted-foreground">
              Relevant chunk
            </div>
            <p className="leading-relaxed text-foreground/90">{chunk.preview}</p>
          </div>
          <div className="flex items-center justify-between border-t border-border/60 pt-2">
            <span className="truncate font-mono text-[10px] text-muted-foreground">
              {chunk.source}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              source
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
