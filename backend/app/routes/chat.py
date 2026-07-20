from fastapi import APIRouter
from ..schemas.chat import ChatRequest, ChatTurnResponse
from ..services import orchestrator, store

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatTurnResponse)
def chat(req: ChatRequest) -> ChatTurnResponse:
    sess = store.get_session(req.session_id)
    persona = sess.config.persona if sess else None
    scenario = sess.config.scenario if sess else None
    result = orchestrator.handle_chat(req, persona=persona, scenario=scenario)
    store.record_turn(req.session_id, result)
    return result
