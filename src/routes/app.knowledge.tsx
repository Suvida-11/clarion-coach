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
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Knowledge Base</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload PDFs, DOCX and TXT. Clario chunks, embeds, and indexes them for
            retrieval by the coaching agent.
          </p>
        </div>
        <Button
          className="bg-brand text-primary-foreground hover:opacity-90"
          onClick={() => fileRef.current?.click()}
          disabled={uploadMut.isPending}
        >
          <Upload className="mr-1.5 h-4 w-4" />
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

      {/* Search */}
      <div className="surface rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-primary" />
          Test retrieval
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="e.g. how do we handle damaged earbuds refunds?"
              className="pl-9"
            />
          </div>
          <Button onClick={search} disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </div>
        {results.length > 0 && (
          <div className="mt-4 space-y-2">
            {results.map((c) => (
              <div key={c.id} className="glass rounded-lg p-3">
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                    <span className="text-sm font-semibold">{c.title}</span>
                  </div>
                  <span className="text-xs font-semibold text-primary">
                    {(c.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.preview}</p>
                <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
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
