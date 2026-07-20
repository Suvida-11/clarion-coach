"""Thin wrapper around google-genai for JSON-mode Gemini calls."""
from __future__ import annotations
import json
import logging
from typing import Any, Optional

from ..config import settings

log = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.GEMINI_API_KEY:
        log.warning("GEMINI_API_KEY not set — Gemini calls will use fallback responses.")
        return None
    try:
        from google import genai  # type: ignore
        _client = genai.Client(api_key=settings.GEMINI_API_KEY)
        return _client
    except Exception as e:  # pragma: no cover
        log.exception("Failed to init Gemini client: %s", e)
        return None


def generate_json(prompt: str, system: Optional[str] = None) -> dict[str, Any] | None:
    """Call Gemini and parse a JSON object out of the response. Returns None on failure."""
    client = _get_client()
    if client is None:
        return None
    try:
        from google.genai import types  # type: ignore
        contents = prompt if system is None else f"{system}\n\n{prompt}"
        resp = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
        text = (resp.text or "").strip()
        return _parse_json(text)
    except Exception as e:
        log.warning("Gemini generate_json failed: %s", e)
        return None


def generate_text(prompt: str, system: Optional[str] = None) -> str | None:
    client = _get_client()
    if client is None:
        return None
    try:
        from google.genai import types  # type: ignore
        contents = prompt if system is None else f"{system}\n\n{prompt}"
        resp = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=types.GenerateContentConfig(temperature=0.8),
        )
        return (resp.text or "").strip()
    except Exception as e:
        log.warning("Gemini generate_text failed: %s", e)
        return None


def _parse_json(text: str) -> dict[str, Any] | None:
    if not text:
        return None
    # strip code fences if present
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        # try to find first { ... }
        try:
            start = text.index("{")
            end = text.rindex("}") + 1
            return json.loads(text[start:end])
        except Exception:
            return None
