import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp")
    CHROMA_DIR: str = os.getenv("CHROMA_DIR", "./chroma_store")
    CORS_ORIGINS: list[str] = [
        o.strip() for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:8080,http://localhost:5173,http://localhost:3000",
        ).split(",") if o.strip()
    ]

settings = Settings()
