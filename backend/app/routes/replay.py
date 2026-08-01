"""Replay Mode backend.

Accepts an uploaded TXT transcript, parses it into ordered messages, and replays
it one message at a time. Every customer message runs the full pipeline:
Intent Analysis -> Knowledge Recommendation -> Coaching -> Escalation.
"""
from __future__ import annotations

import re

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..schemas.chat import (
    ReplayAnalyzeRequest,
    ReplayMessage,
    ReplayStepRequest,
    ReplayTranscript,
    ReplayTurn,
    SessionConfig,
)
from ..services import orchestrator, store

router = APIRouter(prefix="/replay", tags=["replay"])

_CUSTOMER_LABELS = {"customer", "user", "client", "caller", "them"}
_AGENT_LABELS = {"agent", "support", "rep", "representative", "assistant", "me", "you"}
_SYSTEM_LABELS = {"system", "note"}

_LINE_RE = re.compile(r"^\s*(?:\[[^\]]*\]\s*)?([A-Za-z ]{2,20}?)\s*[:>-]\s*(.+)$")


def parse_transcript(text: str) -> list[ReplayMessage]:
    """Parse a TXT transcript into ordered, role-tagged messages.

    Supported line shapes:
        Customer: my order is late
        Agent - let me check that
        [10:02] Support: checking now
    Unlabelled lines alternate, starting with the customer.
    """
    messages: list[ReplayMessage] = []
    next_unlabelled = "customer"
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        role: str | None = None
        content = line
        m = _LINE_RE.match(line)
        if m:
            label = m.group(1).strip().lower()
            body = m.group(2).strip()
            if label in _CUSTOMER_LABELS:
                role, content = "customer", body
            elif label in _AGENT_LABELS:
                role, content = "agent", body
            elif label in _SYSTEM_LABELS:
                role, content = "system", body
        if role is None:
            role = next_unlabelled
            next_unlabelled = "agent" if role == "customer" else "customer"
        else:
            next_unlabelled = "agent" if role == "customer" else "customer"
        if content:
            messages.append(
                ReplayMessage(index=len(messages), role=role, content=content)  # type: ignore[arg-type]
            )
    return messages


def _ensure_replay_session(session_id: str | None) -> str:
    if session_id:
        sess = store.get_session(session_id)
        if sess:
            return sess.id
    sess = store.create_session(
        SessionConfig(
            mode="replay",
            persona="Calm",
            scenario="Replayed Transcript",
            product="General",
            difficulty="Medium",
            language="English",
        )
    )
    return sess.id


@router.post("/upload", response_model=ReplayTranscript)
async def upload(
    file: UploadFile = File(...),
    session_id: str | None = Form(default=None),
) -> ReplayTranscript:
    """Upload a TXT transcript and register it for replay."""
    raw = await file.read()
    try:
        text = raw.decode("utf-8", errors="replace")
    except Exception:
        raise HTTPException(400, "could not decode transcript as text")
    messages = parse_transcript(text)
    if not messages:
        raise HTTPException(400, "transcript contained no readable messages")
    sid = _ensure_replay_session(session_id)
    store.clear_turns(sid)
    transcript = ReplayTranscript(
        session_id=sid,
        filename=file.filename or "transcript.txt",
        total_messages=len(messages),
        messages=messages,
    )
    return store.save_transcript(transcript)


@router.get("/{session_id}", response_model=ReplayTranscript)
def get(session_id: str) -> ReplayTranscript:
    t = store.get_transcript(session_id)
    if not t:
        raise HTTPException(404, "no transcript uploaded for this session")
    return t


@router.post("/step", response_model=ReplayTurn)
def step(req: ReplayStepRequest) -> ReplayTurn:
    """Replay a single message (one step at a time) with full analysis."""
    t = store.get_transcript(req.session_id)
    if not t:
        raise HTTPException(404, "no transcript uploaded for this session")
    if req.index < 0 or req.index >= len(t.messages):
        raise HTTPException(400, "index out of range")
    msg = t.messages[req.index]
    return orchestrator.analyze_replay_message(
        req.session_id, msg.index, msg.role, msg.content
    )


@router.post("/analyze", response_model=list[ReplayTurn])
def analyze(req: ReplayAnalyzeRequest) -> list[ReplayTurn]:
    """Replay the whole transcript, returning complete analysis for every turn."""
    if req.transcript:
        messages = parse_transcript(req.transcript)
        if not messages:
            raise HTTPException(400, "transcript contained no readable messages")
        sid = _ensure_replay_session(req.session_id)
        store.clear_turns(sid)
        store.save_transcript(
            ReplayTranscript(
                session_id=sid,
                filename="inline-transcript.txt",
                total_messages=len(messages),
                messages=messages,
            )
        )
    else:
        t = store.get_transcript(req.session_id)
        if not t:
            raise HTTPException(404, "no transcript uploaded for this session")
        sid, messages = t.session_id, t.messages
        store.clear_turns(sid)

    return [
        orchestrator.analyze_replay_message(sid, m.index, m.role, m.content)
        for m in messages
    ]
