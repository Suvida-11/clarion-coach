from fastapi import APIRouter
from ..config import settings as app_settings
from ..schemas.chat import Settings, NotificationSettings

router = APIRouter(tags=["settings"])

_state = {
    "settings": Settings(
        gemini_api_key_masked=(
            "••••••••••••" + app_settings.GEMINI_API_KEY[-4:]
            if app_settings.GEMINI_API_KEY else "not_configured"
        ),
        theme="dark",
        language="English",
        notifications=NotificationSettings(),
    )
}


@router.get("/settings", response_model=Settings)
def get_settings() -> Settings:
    return _state["settings"]


@router.put("/settings", response_model=Settings)
def put_settings(payload: Settings) -> Settings:
    _state["settings"] = payload
    return payload
