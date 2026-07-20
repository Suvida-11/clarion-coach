from fastapi import APIRouter, HTTPException
from ..schemas.chat import Report, RetrievedChunk
from ..services import store

router = APIRouter(tags=["report"])


@router.get("/report/{session_id}", response_model=Report)
def get_report(session_id: str) -> Report:
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

    # dedupe knowledge chunks by id
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

    return Report(
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
