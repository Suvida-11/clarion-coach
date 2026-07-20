from fastapi import APIRouter, HTTPException
from ..schemas.chat import Session, SessionConfig
from ..services import store

router = APIRouter(prefix="/session", tags=["session"])


@router.post("/start", response_model=Session)
def start(config: SessionConfig) -> Session:
    return store.create_session(config)


@router.get("/latest", response_model=Session | None)
def latest() -> Session | None:
    return store.latest_session()


@router.get("/history", response_model=list[Session])
def history() -> list[Session]:
    return store.list_sessions()


@router.get("/{session_id}", response_model=Session)
def get(session_id: str) -> Session:
    s = store.get_session(session_id)
    if not s:
        raise HTTPException(404, "session not found")
    return s
