import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Upload,
  FileText,
  Trash2,
  Search,
  FileType,
  Sparkles,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { RetrievedChunk } from "@/lib/types";

export const Route = createFileRoute("/app/knowledge")({
  head: () => ({ meta: [{ title: "Knowledge Base — Clario AI" }] }),
  component: KnowledgePage,
});

function KnowledgePage() {
  const qc = useQueryClient();
  const docs = useQuery({ queryKey: ["knowledge"], queryFn: api.knowledgeList });
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [searching, setSearching] = useState(false);

  const uploadMut = useMutation({
    mutationFn: api.knowledgeUpload,
    onSuccess: () => {
      toast.success("Document uploaded & indexed");
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Upload failed"),
  });

  const deleteMut = useMutation({
    mutationFn: api.knowledgeDelete,
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["knowledge"] });
    },
  });

  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const r = await api.knowledgeSearch(query);
      setResults(r.chunks);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Knowledge Base</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Upload PDFs, DOCX and TXT. Clario chunks, embeds, and indexes them for
            retrieval by the coaching agent.
          </p>
        </div>
        <Button
          size="lg"
          className="bg-brand text-primary-foreground shadow-md hover:opacity-90"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadMut.isPending ? "Uploading…" : "Upload document"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".pdf,.docx,.txt,.md"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) uploadMut.mutate(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Upload dropzone */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploadMut.isPending}
        className="group flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card/30 px-6 py-10 text-center transition hover:border-primary/50 hover:bg-primary/5"
      >
        <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:scale-105">
          <Upload className="h-5 w-5" />
        </div>
        <div className="text-sm font-semibold">
          {uploadMut.isPending ? "Uploading & indexing…" : "Drop a file or click to upload"}
        </div>
        <div className="text-xs text-muted-foreground">
          Supports PDF, DOCX, TXT, MD · Auto-chunked and embedded for RAG
        </div>
      </button>

      {/* Search */}
      <div className="surface rounded-2xl p-6">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold tracking-tight">
          <Sparkles className="h-4 w-4 text-primary" />
          Test retrieval
        </h3>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. how do we handle damaged earbuds refunds?"
              className="h-11 pl-10 text-sm"
            />
          </div>
          <Button size="lg" onClick={search} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="mt-5 space-y-3">
            {results.map((c) => (
              <div key={c.id} className="glass hover-lift rounded-xl p-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                    <span className="text-sm font-semibold">{c.title}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {(c.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{c.preview}</p>
                <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                  {c.source}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="surface rounded-2xl p-5">
        <h3 className="mb-3 text-sm font-semibold">Indexed documents</h3>
        <div className="divide-y divide-border">
          {docs.isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="my-2 h-14 w-full" />
            ))}
          {docs.data?.map((d) => (
            <div key={d.id} className="flex items-center gap-4 py-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.filename}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                  <FileType className="h-3 w-3" />
                  {d.type} · {(d.size_bytes / 1024).toFixed(0)} KB · {d.chunks} chunks ·{" "}
                  uploaded {format(new Date(d.uploaded_at), "MMM d")}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMut.mutate(d.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
