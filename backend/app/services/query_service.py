"""Answer a question across every meeting, with citations back to the transcript.

Retrieval is deliberately plain keyword scoring rather than embeddings. At this
corpus size — tens of meetings, a few thousand lines — a vector store would add a
dependency, a build step and an index to keep fresh, and would not retrieve
better than scoring on term overlap. The honest engineering call is to say so
rather than to reach for the fashionable answer.

Like the summariser, this degrades rather than fails: with no LLM key it still
returns the matching transcript lines and an extractive answer built from them.
"""

from __future__ import annotations

import json
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.meeting import Meeting
from app.models.transcript import Speaker, TranscriptSegment

logger = logging.getLogger(__name__)

_WORD = re.compile(r"[A-Za-z][A-Za-z'-]+")

# Question words carry no retrieval signal and would match every line.
_STOP = {
    "the", "and", "for", "was", "were", "what", "when", "who", "why", "how",
    "did", "does", "are", "his", "her", "she", "they", "them", "that", "this",
    "with", "from", "have", "has", "had", "about", "there", "their", "been",
    "which", "would", "could", "should", "will", "any", "all", "our", "you",
}

MAX_CITED_SEGMENTS = 40
MAX_CONTEXT_CHARS = 40_000


def _terms(question: str) -> set[str]:
    return {
        word.lower()
        for word in _WORD.findall(question)
        if len(word) > 2 and word.lower() not in _STOP
    }


def _score(text: str, terms: set[str]) -> int:
    """Distinct terms present, not raw frequency — one line repeating a word
    should not outrank a line that actually covers the question."""
    lowered = text.lower()
    return sum(1 for term in terms if term in lowered)


def _retrieve(db: Session, question: str, meeting_ids: list[int] | None) -> list[dict]:
    terms = _terms(question)
    if not terms:
        return []

    stmt = (
        select(TranscriptSegment, Meeting.title, Speaker.label)
        .join(Meeting, Meeting.id == TranscriptSegment.meeting_id)
        .outerjoin(Speaker, Speaker.id == TranscriptSegment.speaker_id)
    )
    if meeting_ids:
        stmt = stmt.where(TranscriptSegment.meeting_id.in_(meeting_ids))

    scored = []
    for segment, title, speaker_label in db.execute(stmt).all():
        score = _score(segment.text, terms)
        if score:
            scored.append(
                {
                    "score": score,
                    "meeting_id": segment.meeting_id,
                    "meeting_title": title,
                    "start_ms": segment.start_ms,
                    "speaker_label": speaker_label,
                    "text": segment.text,
                }
            )

    scored.sort(key=lambda hit: (-hit["score"], hit["meeting_id"], hit["start_ms"]))
    return scored[:MAX_CITED_SEGMENTS]


def _extractive_answer(question: str, hits: list[dict]) -> str:
    """No-LLM fallback: say what was found and where, without pretending to reason."""
    if not hits:
        return "Nothing in the transcripts matches that question."

    meetings = []
    for hit in hits:
        if hit["meeting_title"] not in meetings:
            meetings.append(hit["meeting_title"])

    lead = (
        f"Found {len(hits)} matching line{'s' if len(hits) != 1 else ''} "
        f"across {len(meetings)} meeting{'s' if len(meetings) != 1 else ''}: "
        f"{', '.join(meetings[:3])}"
        f"{' and others' if len(meetings) > 3 else ''}."
    )
    top = hits[0]
    speaker = top["speaker_label"] or "Someone"
    return f"{lead} The closest line is {speaker}: \"{top['text'][:240]}\""


_SYSTEM = """You answer questions about meeting transcripts. You are given \
numbered excerpts. Return ONLY a JSON object, no prose, no markdown fences:

{"answer": "...", "used": [1, 4, 7]}

Rules:
- Answer only from the excerpts. If they do not contain the answer, say so plainly.
- "used" lists the excerpt numbers you actually relied on. Never cite an excerpt
  you did not use, and never invent a number.
- Be specific and brief. Name people and decisions. No preamble."""


def _llm_answer(question: str, hits: list[dict]) -> tuple[str, list[int]]:
    settings = get_settings()
    lines, used = [], 0
    for index, hit in enumerate(hits, start=1):
        speaker = hit["speaker_label"] or "Unknown"
        line = f'{index}. [{hit["meeting_title"]}] {speaker}: {hit["text"]}'
        if used + len(line) > MAX_CONTEXT_CHARS:
            break
        lines.append(line)
        used += len(line)

    response = httpx.post(
        f"{settings.llm_base_url.rstrip('/')}/chat/completions",
        headers={"Authorization": f"Bearer {settings.llm_api_key}"},
        json={
            "model": settings.llm_model,
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {
                    "role": "user",
                    "content": f"Question: {question}\n\nExcerpts:\n" + "\n".join(lines),
                },
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        },
        timeout=settings.llm_timeout_seconds,
    )
    response.raise_for_status()
    payload = json.loads(response.json()["choices"][0]["message"]["content"])

    answer = str(payload.get("answer") or "").strip()
    if not answer:
        raise ValueError("model returned no answer")

    # Drop any index the model invented; a citation that does not resolve is worse
    # than no citation at all.
    used_indexes = [
        int(n) for n in payload.get("used") or []
        if isinstance(n, (int, float)) and 1 <= int(n) <= len(lines)
    ]
    return answer, used_indexes


def answer_question(
    db: Session,
    question: str,
    *,
    meeting_ids: list[int] | None = None,
) -> dict:
    hits = _retrieve(db, question, meeting_ids)
    settings = get_settings()

    if hits and settings.llm_enabled:
        try:
            answer, used = _llm_answer(question, hits)
            cited = [hits[i - 1] for i in used] if used else hits[:5]
            provider = settings.llm_base_url.split("//")[-1].split("/")[0].split(".")
            engine = f"{provider[-2] if len(provider) >= 2 else provider[0]}:{settings.llm_model}"
            return {"answer": answer, "citations": cited, "answered_by": engine}
        except (httpx.HTTPError, KeyError, IndexError, json.JSONDecodeError, ValueError) as exc:
            logger.warning("LLM query unavailable, falling back to extraction: %s", exc)

    return {
        "answer": _extractive_answer(question, hits),
        "citations": hits[:5],
        "answered_by": "keyword",
    }
