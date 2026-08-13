"""LLM-backed summarisation against any OpenAI-compatible endpoint (Groq by default).

This is the swap-in behind `summarizer.generate()`. It deliberately produces the
same `GeneratedSummary` the extractive path does, so nothing downstream — the
ingest service, the schemas, the frontend — knows or cares which one ran.

Every failure here is non-fatal. A bad key, a rate limit, a timeout or malformed
JSON all raise `LLMUnavailable`, and the caller falls back to the deterministic
summariser. A meeting must never fail to ingest because a third party was down.
"""

from __future__ import annotations

import json
import logging

import httpx

from app.core.config import get_settings
from app.services.transcript_parser import ParsedSegment

logger = logging.getLogger(__name__)

# Enough transcript to summarise well without blowing the context window or the
# rate limit. 60k characters is roughly a 90-minute meeting.
MAX_TRANSCRIPT_CHARS = 60_000


class LLMUnavailable(RuntimeError):
    """The provider could not produce a usable summary. Always recoverable."""


_SYSTEM = """You are a meeting-notes generator. You read a transcript and return \
structured notes. Return ONLY a JSON object, no prose, no markdown fences.

Schema:
{
  "overview": "2-4 sentence factual summary. No preamble like 'This meeting was about'.",
  "keywords": ["6-10 short topic phrases, lowercase, no duplicates"],
  "bullet_notes": [{"title": "Section heading", "points": ["Full-sentence note", ...]}],
  "chapters": [{"title": "Short chapter title", "gist": "One sentence", "start_ms": 0}],
  "action_items": [{"text": "The commitment as a sentence", "assignee_label": "Speaker name or null"}]
}

Rules:
- start_ms MUST be copied from a [start_ms] marker in the transcript. Never invent one.
- assignee_label MUST exactly match a speaker name in the transcript, or be null.
- Base everything on what was said. Do not speculate or add recommendations.
- 3-6 chapters, 2-4 bullet sections, only genuine commitments as action items."""


def _render_transcript(segments: list[ParsedSegment]) -> str:
    """Inline the start time with each line so the model can cite real offsets."""
    lines = []
    used = 0
    for segment in segments:
        speaker = segment.speaker_label or "Unknown"
        line = f"[{segment.start_ms}] {speaker}: {segment.text}"
        if used + len(line) > MAX_TRANSCRIPT_CHARS:
            lines.append("[transcript truncated]")
            break
        lines.append(line)
        used += len(line)
    return "\n".join(lines)


def _coerce(payload: dict, *, duration_ms: int) -> dict:
    """Trust nothing. Models drift on schema even with JSON mode enabled."""
    overview = str(payload.get("overview") or "").strip()
    if not overview:
        raise LLMUnavailable("model returned no overview")

    keywords = [str(k).strip() for k in payload.get("keywords") or [] if str(k).strip()]

    bullet_notes = []
    for section in payload.get("bullet_notes") or []:
        if not isinstance(section, dict):
            continue
        points = [str(p).strip() for p in section.get("points") or [] if str(p).strip()]
        title = str(section.get("title") or "").strip()
        if title and points:
            bullet_notes.append({"title": title, "points": points})

    chapters = []
    for chapter in payload.get("chapters") or []:
        if not isinstance(chapter, dict):
            continue
        title = str(chapter.get("title") or "").strip()
        if not title:
            continue
        try:
            start_ms = int(chapter.get("start_ms") or 0)
        except (TypeError, ValueError):
            continue
        # A hallucinated offset past the end of the recording would make the
        # chapter unseekable, which is worse than dropping it.
        if not 0 <= start_ms <= duration_ms:
            continue
        gist = str(chapter.get("gist") or "").strip() or None
        chapters.append({"title": title, "gist": gist, "start_ms": start_ms, "end_ms": None})
    chapters.sort(key=lambda c: c["start_ms"])

    action_items = []
    for item in payload.get("action_items") or []:
        if not isinstance(item, dict):
            continue
        text = str(item.get("text") or "").strip()
        if not text:
            continue
        label = item.get("assignee_label")
        action_items.append(
            {"text": text, "assignee_label": str(label).strip() if label else None}
        )

    return {
        "overview": overview,
        "keywords": keywords,
        "bullet_notes": bullet_notes,
        "chapters": chapters,
        "action_items": action_items,
    }


def summarize(title: str, segments: list[ParsedSegment], *, duration_ms: int) -> dict:
    """Returns the GeneratedSummary field dict, or raises LLMUnavailable."""
    settings = get_settings()
    if not settings.llm_enabled:
        raise LLMUnavailable("no API key configured")

    prompt = (
        f"Meeting title: {title}\n"
        f"Duration: {duration_ms} ms\n\n"
        f"Transcript (each line prefixed with its start offset in ms):\n"
        f"{_render_transcript(segments)}"
    )

    try:
        response = httpx.post(
            f"{settings.llm_base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {settings.llm_api_key}"},
            json={
                "model": settings.llm_model,
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
                # Low but non-zero: summaries read as stilted at 0.
                "temperature": 0.3,
                "response_format": {"type": "json_object"},
            },
            timeout=settings.llm_timeout_seconds,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        payload = json.loads(content)
    except httpx.HTTPStatusError as exc:
        raise LLMUnavailable(f"{exc.response.status_code} from provider") from exc
    except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError, ValueError) as exc:
        raise LLMUnavailable(str(exc)) from exc

    if not isinstance(payload, dict):
        raise LLMUnavailable("model did not return a JSON object")

    return _coerce(payload, duration_ms=duration_ms)
