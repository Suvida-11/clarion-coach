"""In-memory session + turn store (swap for a real DB in production)."""
from __future__ import annotations
import uuid
from datetime import datetime, timezone
from ..schemas.chat import (
    ChatMessage,
    ChatTurnResponse,
    ReplayTranscript,
    Session,
    SessionConfig,
)

_sessions: dict[str, Session] = {}
_turns: dict[str, list[ChatTurnResponse]] = {}


def create_session(config: SessionConfig) -> Session:
    sid = f"sess_{uuid.uuid4().hex[:10]}"
    sess = Session(
        id=sid,
        config=config,
        started_at=datetime.now(timezone.utc).isoformat(),
        status="active",
        turn_count=0,
        resolution_score=None,
    )
    _sessions[sid] = sess
    _turns[sid] = []
    return sess


def get_session(sid: str) -> Session | None:
    return _sessions.get(sid)


def latest_session() -> Session | None:
    if not _sessions:
        return None
    return sorted(_sessions.values(), key=lambda s: s.started_at, reverse=True)[0]


def list_sessions() -> list[Session]:
    return sorted(_sessions.values(), key=lambda s: s.started_at, reverse=True)


def record_turn(sid: str, turn: ChatTurnResponse) -> None:
    if sid not in _turns:
        _turns[sid] = []
    _turns[sid].append(turn)
    if sid in _sessions:
        s = _sessions[sid]
        s.turn_count = len(_turns[sid])


def session_turns(sid: str) -> list[ChatTurnResponse]:
    return _turns.get(sid, [])


# ---------------------------------------------------------------------------
# Replay transcripts
# ---------------------------------------------------------------------------
_transcripts: dict[str, "ReplayTranscript"] = {}


def save_transcript(transcript: "ReplayTranscript") -> "ReplayTranscript":
    _transcripts[transcript.session_id] = transcript
    return transcript


def get_transcript(sid: str) -> "ReplayTranscript | None":
    return _transcripts.get(sid)


def clear_turns(sid: str) -> None:
    _turns[sid] = []
    if sid in _sessions:
        _sessions[sid].turn_count = 0
