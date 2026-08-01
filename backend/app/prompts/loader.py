"""Loader for external system prompt markdown files.

All agent system prompts live in `backend/prompts/*.md`. Nothing in the
codebase should hardcode a prompt body; agents import the loaded constants
from `app.prompts.system_prompts`, which delegates here.
"""
from __future__ import annotations

import logging
from pathlib import Path

log = logging.getLogger(__name__)

# backend/app/prompts/loader.py -> parents[2] == backend/
PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"

_cache: dict[str, str] = {}


def prompts_dir() -> Path:
    return PROMPTS_DIR


def load_prompt(name: str, fallback: str = "") -> str:
    """Load `<name>.md` from backend/prompts (cached).

    `name` may be given with or without the `.md` suffix.
    """
    key = name[:-3] if name.endswith(".md") else name
    if key in _cache:
        return _cache[key]
    path = PROMPTS_DIR / f"{key}.md"
    try:
        text = path.read_text(encoding="utf-8").strip()
        if not text:
            raise ValueError("empty prompt file")
        _cache[key] = text
        return text
    except Exception as e:
        log.warning("Prompt file %s unavailable (%s) — using fallback.", path, e)
        _cache[key] = fallback
        return fallback


def prompt_version(name: str) -> str:
    """Extract the `**Prompt Version:** x.y.z` marker from a prompt file."""
    text = load_prompt(name)
    for line in text.splitlines():
        if "Prompt Version:" in line:
            return line.split("Prompt Version:")[-1].replace("*", "").strip()
    return "unknown"


def available_prompts() -> list[str]:
    try:
        return sorted(p.stem for p in PROMPTS_DIR.glob("*.md"))
    except Exception:
        return []


def reload_prompts() -> None:
    _cache.clear()
