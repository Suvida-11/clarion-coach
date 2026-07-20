from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .routes import analytics, chat, knowledge, report, session, settings as settings_route

app = FastAPI(title="Clario AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(session.router)
app.include_router(chat.router)
app.include_router(knowledge.router)
app.include_router(report.router)
app.include_router(analytics.router)
app.include_router(settings_route.router)


@app.get("/")
def root() -> dict:
    return {"service": "clario-ai", "status": "ok", "docs": "/docs"}


@app.get("/health")
def health() -> dict:
    return {"ok": True, "gemini_configured": bool(settings.GEMINI_API_KEY)}
