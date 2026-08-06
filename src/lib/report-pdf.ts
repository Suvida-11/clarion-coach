import { jsPDF } from "jspdf";
import type { ChatTurnResponse, Report } from "./types";
import type { SessionArchive } from "./session-archive";

const MARGIN = 46;
const NAVY: [number, number, number] = [23, 32, 58];
const BRAND: [number, number, number] = [79, 108, 255];
const MUTED: [number, number, number] = [110, 118, 138];
const LINE: [number, number, number] = [214, 219, 232];

interface BuildOptions {
  report: Report;
  sessionId: string;
  userName?: string;
  archive?: SessionArchive | null;
  scenario?: string;
  product?: string;
  persona?: string;
  mode?: string;
}

/**
 * Client-side post-interaction PDF report. Mirrors the FastAPI
 * /report/{id}/pdf layout so the download works in every environment.
 */
export function buildReportPdf(opts: BuildOptions): Blob {
  const { report, sessionId, userName, archive } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = 0;

  const ensure = (needed: number) => {
    if (y + needed > pageH - 56) {
      footer();
      doc.addPage();
      y = MARGIN;
    }
  };

  const footer = () => {
    const page = doc.getNumberOfPages();
    doc.setDrawColor(...LINE);
    doc.line(MARGIN, pageH - 42, pageW - MARGIN, pageH - 42);
    doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED);
    doc.text(`Clarion Coach · Session ${sessionId}`, MARGIN, pageH - 28);
    doc.text(`Page ${page}`, pageW - MARGIN, pageH - 28, { align: "right" });
  };

  // ---- Header band (logo + title) ----
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 108, "F");
  doc.setFillColor(...BRAND);
  doc.roundedRect(MARGIN, 30, 34, 34, 9, 9, "F");
  doc.setFont("helvetica", "bold").setFontSize(18).setTextColor(255, 255, 255);
  doc.text("C", MARGIN + 11, 54);
  doc.setFontSize(20);
  doc.text("Clarion Coach", MARGIN + 46, 48);
  doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(198, 205, 225);
  doc.text("AI Powered Customer Support Coaching Assistant", MARGIN + 46, 66);
  doc.setFontSize(9);
  doc.text("Post-Interaction Report", pageW - MARGIN, 44, { align: "right" });
  doc.text(new Date().toLocaleString(), pageW - MARGIN, 60, { align: "right" });
  y = 140;

  const heading = (text: string) => {
    ensure(46);
    doc.setFont("helvetica", "bold").setFontSize(12).setTextColor(...NAVY);
    doc.text(text, MARGIN, y);
    y += 8;
    doc.setDrawColor(...BRAND);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, y, MARGIN + 42, y);
    doc.setLineWidth(0.6);
    y += 16;
  };

  const body = (text: string, indent = 0) => {
    doc.setFont("helvetica", "normal").setFontSize(10).setTextColor(40, 46, 64);
    const lines = doc.splitTextToSize(text, contentW - indent) as string[];
    for (const line of lines) {
      ensure(16);
      doc.text(line, MARGIN + indent, y);
      y += 14;
    }
  };

  const bullets = (items: string[]) => {
    if (!items.length) {
      body("—");
      return;
    }
    for (const item of items) {
      ensure(18);
      doc.setFillColor(...BRAND);
      doc.circle(MARGIN + 3, y - 3, 1.8, "F");
      body(item, 14);
      y += 2;
    }
  };

  const rows = (pairs: [string, string][]) => {
    for (const [k, v] of pairs) {
      ensure(18);
      doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...MUTED);
      doc.text(k, MARGIN, y);
      doc.setFont("helvetica", "normal").setTextColor(40, 46, 64);
      const lines = doc.splitTextToSize(v || "—", contentW - 150) as string[];
      doc.text(lines[0], MARGIN + 150, y);
      y += 14;
      for (const extra of lines.slice(1)) {
        ensure(16);
        doc.text(extra, MARGIN + 150, y);
        y += 14;
      }
    }
    y += 6;
  };

  const gap = () => {
    y += 10;
  };

  const turns = archive?.turns ?? [];
  // Fall back to reconstructing the transcript from the analysed turns so the
  // report never prints "No transcript captured" when turns exist.
  const messages =
    archive?.messages?.length
      ? archive.messages
      : turns.flatMap((t) =>
          [t.turn, t.simulated_customer_reply].filter((m): m is NonNullable<typeof m> => !!m),
        );
  const last: ChatTurnResponse | undefined = turns[turns.length - 1];
  const coaching = last?.coaching;
  const scores = coaching?.scores;
  const analysis = last?.analysis;
  const risk = last?.risk;
  const avgScore =
    turns.length > 0
      ? Math.round(
          turns.reduce((a, t) => a + (t.coaching?.coaching_score ?? 0), 0) / turns.length,
        )
      : report.resolution_score;

  // 1. Session information
  heading("1. Session Information");
  rows([
    ["Session ID", sessionId],
    ["Coach / Agent", userName || "Clarion Coach user"],
    ["Date", new Date().toLocaleDateString()],
    ["Time", new Date().toLocaleTimeString()],
    ["Mode", opts.mode ?? "Simulator"],
    ["Scenario / Issue", opts.scenario ?? report.intent_progression[0] ?? "—"],
    ["Product", opts.product ?? "—"],
    ["Customer persona", opts.persona ?? "—"],
    ["Turns analysed", String(turns.length || report.sentiment_timeline.length)],
    ["Overall coaching score", `${avgScore} / 100`],
  ]);

  // 2. Conversation transcript
  heading("2. Conversation Transcript");
  if (messages.length) {
    for (const m of messages) {
      ensure(20);
      const stamp = new Date(m.timestamp).toLocaleTimeString();
      doc.setFont("helvetica", "bold").setFontSize(9);
      doc.setTextColor(...(m.role === "agent" ? BRAND : NAVY));
      doc.text(`${m.role === "agent" ? "Agent" : "Customer"} · ${stamp}`, MARGIN, y);
      y += 13;
      body(m.content, 12);
      y += 4;
    }
  } else {
    body("No transcript captured for this session.");
  }
  gap();

  // 3. Intent analysis
  heading("3. Intent Analysis");
  rows([
    ["Primary intent", analysis?.intent ?? report.intent_progression[0] ?? "—"],
    ["Confidence", analysis ? `${Math.round((analysis.confidence ?? 0) * 100)}%` : "—"],
    ["Intent progression", report.intent_progression.join("  >  ")],
  ]);

  // 4. Sentiment analysis
  heading("4. Sentiment Analysis");
  rows([
    ["Sentiment", (analysis?.sentiment ?? "neutral").replace("_", " ")],
    ["Sentiment score", analysis ? analysis.sentiment_score.toFixed(2) : "—"],
    ["Frustration", analysis ? `${Math.round((analysis.frustration ?? 0) * 100)}%` : "—"],
    ["Satisfaction trend", analysis?.satisfaction_trend ?? "steady"],
    [
      "Sentiment journey",
      report.sentiment_timeline.map((p) => `T${p.turn}: ${p.score.toFixed(2)}`).join("   "),
    ],
  ]);

  // 5. Knowledge recommendations
  heading("5. Knowledge Recommendations");
  const kb = last?.knowledge?.length ? last.knowledge : report.knowledge_used;
  bullets(
    kb.map((c) => `${c.title} (${(c.similarity * 100).toFixed(0)}% match, ${c.type}) — ${c.preview}`),
  );
  gap();

  // 6. AI draft responses (customer-facing replies)
  heading("6. AI Draft Responses (Recommended Replies)");
  if (turns.length) {
    turns.forEach((t, i) => {
      if (!t.coaching?.suggested_response) return;
      ensure(20);
      doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...BRAND);
      doc.text(`Turn ${i + 1} · ${new Date(t.turn.timestamp).toLocaleTimeString()}`, MARGIN, y);
      y += 13;
      body(t.coaching.suggested_response, 12);
      y += 6;
    });
  } else if (coaching?.suggested_response) {
    body(coaching.suggested_response);
  } else {
    body("—");
  }
  gap();

  // 7. Coaching analysis
  heading("7. Coaching Analysis");
  bullets(
    [
      ...(coaching?.tone_notes ?? []),
      ...(coaching?.empathy_notes ?? []),
      ...(coaching?.clarity_notes ?? []),
      ...(coaching?.professional_notes ?? []),
      coaching?.next_best_action ? `Next best action: ${coaching.next_best_action}` : undefined,
    ].filter((v): v is string => !!v),
  );
  gap();

  // 7. Coaching score + category scores
  heading("8. Coaching Score & Category Breakdown");
  rows([["Overall score", `${coaching?.coaching_score ?? avgScore} / 100`]]);
  if (scores) {
    const cats: [string, number | undefined][] = [
      ["Tone", scores.tone],
      ["Empathy", scores.empathy],
      ["Grammar", scores.grammar],
      ["Clarity", scores.clarity],
      ["Professionalism", scores.professionalism],
      ["Knowledge grounding", scores.knowledge_grounding],
      ["Resolution quality", scores.resolution_quality],
    ];
    for (const [label, value] of cats) {
      if (typeof value !== "number") continue;
      ensure(22);
      doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40, 46, 64);
      doc.text(label, MARGIN, y);
      doc.setDrawColor(...LINE);
      doc.setFillColor(238, 241, 249);
      doc.roundedRect(MARGIN + 150, y - 8, 260, 9, 4, 4, "F");
      doc.setFillColor(...BRAND);
      doc.roundedRect(MARGIN + 150, y - 8, Math.max(6, (value / 100) * 260), 9, 4, 4, "F");
      doc.text(`${value.toFixed(1)}`, MARGIN + 424, y);
      y += 18;
    }
    y += 4;
  }
  if (coaching?.score_reasoning) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...MUTED);
    ensure(16);
    doc.text("Reasoning", MARGIN, y);
    y += 14;
    body(coaching.score_reasoning);
  }
  gap();

  // 8. Escalation risk
  heading("9. Escalation Risk");
  rows([
    ["Risk level", (risk?.level ?? "low").toUpperCase()],
    ["Probability", risk ? `${Math.round(risk.probability * 100)}%` : "—"],
    ["Repeated complaints", String(risk?.repeated_complaints ?? 0)],
    ["Resolution status", (risk?.resolution_status ?? "unresolved").replace("_", " ")],
    ["Reasoning", risk?.reasoning ?? "—"],
    ["Recommended action", risk?.recommended_action ?? "—"],
  ]);
  if (report.escalation_events.length) {
    bullets(
      report.escalation_events.map((e) => `Turn ${e.turn} · ${e.level.toUpperCase()} — ${e.reason}`),
    );
    gap();
  }

  // 9. Resolution summary
  heading("10. Resolution Summary");
  body(report.summary);
  gap();

  // 10. Performance summary
  heading("11. Performance Summary");
  body("Strengths");
  bullets(report.strengths);
  gap();
  body("Areas to improve");
  bullets(report.weaknesses);
  gap();

  // 11. Communication tips
  heading("12. Communication Tips");
  bullets(report.improvements);
  gap();

  // 12. Professional recommendations
  heading("13. Professional Recommendations");
  bullets(report.recommendations);

  footer();
  return doc.output("blob");
}
