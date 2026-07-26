from __future__ import annotations
import io
from datetime import datetime

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..schemas.chat import Report, RetrievedChunk
from ..services import store

router = APIRouter(tags=["report"])


def _build_report(session_id: str) -> tuple[Report, list]:
    sess = store.get_session(session_id)
    if not sess:
        raise HTTPException(404, "session not found")
    turns = store.session_turns(session_id)

    sentiment_timeline = [
        {"turn": i + 1, "score": t.analysis.sentiment_score} for i, t in enumerate(turns)
    ]
    intent_progression = [t.analysis.intent for t in turns]
    escalation_events = [
        {"turn": i + 1, "level": t.risk.level, "reason": t.risk.reasoning}
        for i, t in enumerate(turns) if t.risk.level in ("high", "critical")
    ]

    seen: dict[str, RetrievedChunk] = {}
    for t in turns:
        for c in t.knowledge:
            seen.setdefault(c.id, c)
    knowledge_used = list(seen.values())

    if turns:
        avg_sent = sum(t.analysis.sentiment_score for t in turns) / len(turns)
        resolution = max(0.0, min(1.0, 0.6 + 0.3 * avg_sent)) * 100
    else:
        resolution = 0.0

    report = Report(
        session_id=session_id,
        summary=(
            f"{sess.config.mode.title()} session with a {sess.config.persona.lower()} persona "
            f"about: {sess.config.scenario}."
        ),
        resolution_score=round(resolution, 1),
        sentiment_timeline=sentiment_timeline,
        intent_progression=intent_progression,
        escalation_events=escalation_events,
        knowledge_used=knowledge_used,
        strengths=["Maintained professional tone", "Used knowledge base effectively"],
        weaknesses=["Could lead with more empathy"],
        improvements=["Acknowledge emotion before proposing solutions"],
        recommendations=["Review empathy training module", "Practice de-escalation scripts"],
    )
    return report, turns


@router.get("/report/{session_id}", response_model=Report)
def get_report(session_id: str) -> Report:
    report, _ = _build_report(session_id)
    return report


@router.get("/report/{session_id}/pdf")
def get_report_pdf(session_id: str, user: str | None = None):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle, PageBreak,
    )

    report, turns = _build_report(session_id)
    sess = store.get_session(session_id)
    assert sess is not None

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=LETTER,
        leftMargin=0.7 * inch, rightMargin=0.7 * inch,
        topMargin=0.7 * inch, bottomMargin=0.7 * inch,
        title=f"Clario AI Session Report {session_id}",
    )
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontSize=20, textColor=colors.HexColor("#0f172a"), spaceAfter=6)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=13, textColor=colors.HexColor("#1e293b"), spaceBefore=12, spaceAfter=4)
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10, leading=14, textColor=colors.HexColor("#0f172a"))
    small = ParagraphStyle("small", parent=body, fontSize=9, textColor=colors.HexColor("#475569"))
    muted = ParagraphStyle("muted", parent=body, fontSize=9, textColor=colors.HexColor("#64748b"))

    flow: list = []
    flow.append(Paragraph("Clario AI — Post-Interaction Report", h1))
    meta_rows = [
        ["User", user or "—"],
        ["Session ID", session_id],
        ["Date & Time", datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")],
        ["Persona", sess.config.persona],
        ["Scenario", sess.config.scenario],
        ["Mode", sess.config.mode.title()],
        ["Difficulty", sess.config.difficulty],
        ["Resolution Score", f"{report.resolution_score} / 100"],
    ]
    tbl = Table(meta_rows, colWidths=[1.4 * inch, 5.4 * inch])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#0f172a")),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
    ]))
    flow.append(tbl)

    flow.append(Paragraph("Executive Summary", h2))
    flow.append(Paragraph(report.summary, body))

    # Conversation transcript
    flow.append(Paragraph("Conversation Transcript", h2))
    if not turns:
        flow.append(Paragraph("(No turns recorded.)", muted))
    for i, t in enumerate(turns, start=1):
        who = "Agent" if t.turn.role == "agent" else "Customer"
        flow.append(Paragraph(f"<b>Turn {i} — {who}:</b> {t.turn.content}", body))
        if t.simulated_customer_reply:
            flow.append(Paragraph(
                f"<b>Customer:</b> {t.simulated_customer_reply.content}", body))
        flow.append(Spacer(1, 4))

    # Intent + Sentiment per turn
    flow.append(Paragraph("Intent & Sentiment Analysis", h2))
    if turns:
        data = [["#", "Intent", "Sentiment", "Score", "Frustration", "Confidence"]]
        for i, t in enumerate(turns, start=1):
            a = t.analysis
            data.append([
                str(i), a.intent, a.sentiment,
                f"{a.sentiment_score:+.2f}",
                f"{a.frustration:.2f}",
                f"{a.confidence:.2f}",
            ])
        analysis_tbl = Table(data, colWidths=[0.35 * inch, 1.7 * inch, 1.1 * inch, 0.8 * inch, 1.0 * inch, 1.0 * inch])
        analysis_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0ea5e9")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
            ("ALIGN", (0, 0), (-1, -1), "LEFT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
        ]))
        flow.append(analysis_tbl)
    else:
        flow.append(Paragraph("(No analysis available.)", muted))

    # Emotion timeline
    flow.append(Paragraph("Emotion Timeline", h2))
    if turns:
        emotion_rows = [["Turn", "Sentiment", "Score", "Frustration"]]
        for i, t in enumerate(turns, start=1):
            emotion_rows.append([str(i), t.analysis.sentiment, f"{t.analysis.sentiment_score:+.2f}", f"{t.analysis.frustration:.2f}"])
        etbl = Table(emotion_rows, colWidths=[0.6 * inch, 1.6 * inch, 1.0 * inch, 1.0 * inch])
        etbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6366f1")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
        ]))
        flow.append(etbl)
    else:
        flow.append(Paragraph("(No emotion data.)", muted))

    # Coaching suggestions
    flow.append(PageBreak())
    flow.append(Paragraph("Coaching Suggestions", h2))
    if turns:
        for i, t in enumerate(turns, start=1):
            c = t.coaching
            flow.append(Paragraph(f"<b>Turn {i}:</b> {c.suggested_response}", body))
            tips = []
            if c.empathy_notes:
                tips.append("Empathy: " + "; ".join(c.empathy_notes))
            if c.tone_notes:
                tips.append("Tone: " + "; ".join(c.tone_notes))
            if c.professional_notes:
                tips.append("Professional: " + "; ".join(c.professional_notes))
            for tip in tips:
                flow.append(Paragraph(tip, small))
            flow.append(Spacer(1, 6))
    else:
        flow.append(Paragraph("(No coaching output.)", muted))

    # Knowledge articles
    flow.append(Paragraph("Knowledge Base Articles Retrieved", h2))
    if report.knowledge_used:
        for c in report.knowledge_used:
            flow.append(Paragraph(
                f"<b>{c.title}</b> — <i>{c.type}</i> · similarity {c.similarity * 100:.0f}%", body))
            flow.append(Paragraph(c.preview, small))
            flow.append(Spacer(1, 4))
    else:
        flow.append(Paragraph("(No knowledge articles retrieved.)", muted))

    # Escalation risk
    flow.append(Paragraph("Escalation Risk", h2))
    if report.escalation_events:
        for e in report.escalation_events:
            flow.append(Paragraph(
                f"Turn {e['turn']} — <b>{e['level'].upper()}</b>: {e['reason']}", body))
    else:
        flow.append(Paragraph("No high or critical escalation events recorded.", muted))

    # Conclusion
    flow.append(Paragraph("Conversation Summary & Recommendations", h2))
    for label, items in [
        ("Strengths", report.strengths),
        ("Weaknesses", report.weaknesses),
        ("Improvements", report.improvements),
        ("Recommendations", report.recommendations),
    ]:
        flow.append(Paragraph(f"<b>{label}</b>", body))
        for it in items:
            flow.append(Paragraph(f"• {it}", small))
        flow.append(Spacer(1, 4))

    doc.build(flow)
    buf.seek(0)
    filename = f"clario-report-{session_id}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
