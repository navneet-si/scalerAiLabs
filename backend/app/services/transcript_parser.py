"""Normalises an uploaded or pasted transcript into segments and speaker labels.

Three input shapes are accepted — WebVTT, the fixture JSON, and plain text — and
all three collapse to the same `ParsedTranscript`. Everything downstream
(persistence, the summary generator, the player) is therefore written once
against one shape instead of three times against three.

Speakers come out of here as **labels, not people**. A `.vtt` gives you
`"Speaker 1"`, which is a diarization artefact rather than a participant.
Resolving a label onto a real person is a separate step in the ingest service,
which is exactly why `speakers` and `participants` are different tables.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Literal

TranscriptFormat = Literal["vtt", "json", "text"]

# Used to time a pasted transcript that carries no timestamps of its own. Normal
# conversational pace is ~2.5-3 words/second; without this a pasted transcript
# would have no timeline and the player would have nothing to seek over.
WORDS_PER_SECOND = 2.75
MIN_SEGMENT_MS = 1200


class TranscriptParseError(ValueError):
    """Raised when input cannot be read as a transcript. Surfaces as a 422."""


@dataclass
class ParsedSegment:
    speaker_label: str | None
    start_ms: int
    end_ms: int
    text: str


@dataclass
class ParsedTranscript:
    segments: list[ParsedSegment]
    duration_ms: int

    @property
    def speaker_labels(self) -> list[str]:
        """Distinct labels in order of first appearance, which becomes `display_order`."""
        ordered: list[str] = []
        for segment in self.segments:
            if segment.speaker_label and segment.speaker_label not in ordered:
                ordered.append(segment.speaker_label)
        return ordered


_TIMESTAMP = re.compile(r"(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?")
_CUE = re.compile(r"^(?P<start>[\d:.,]+)\s*-->\s*(?P<end>[\d:.,]+)")
_VOICE = re.compile(r"<v(?:\.[\w.\-]+)*\s+([^>]+)>", re.IGNORECASE)
_ANY_TAG = re.compile(r"<[^>]+>")
_LEADING_STAMP = re.compile(r"^\[?((?:\d+:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?)\]?\s*[-–]?\s*")
# A speaker prefix is a short name followed by a colon. Deliberately capped at 40
# characters so a sentence containing a colon is not mistaken for an utterance.
_SPEAKER_PREFIX = re.compile(r"^([^\s:][^:\n]{0,39}?)\s*:\s+(.+)$")


def detect_format(raw: str) -> TranscriptFormat:
    stripped = raw.lstrip("﻿ \t\r\n")
    if stripped[:6].upper() == "WEBVTT":
        return "vtt"
    if stripped[:1] in "{[":
        return "json"
    return "text"


def _timestamp_to_ms(raw: str) -> int:
    match = _TIMESTAMP.fullmatch(raw.strip())
    if not match:
        raise TranscriptParseError(f"Unrecognised timestamp {raw!r}")
    hours, minutes, seconds, millis = match.groups()
    total_seconds = int(hours or 0) * 3600 + int(minutes) * 60 + int(seconds)
    return total_seconds * 1000 + int((millis or "0").ljust(3, "0"))


def _estimate_ms(text: str) -> int:
    return max(MIN_SEGMENT_MS, round(len(text.split()) / WORDS_PER_SECOND * 1000))


def _normalise(segments: list[ParsedSegment]) -> list[ParsedSegment]:
    """Force the ordered, non-overlapping timeline the schema requires.

    Real VTT files routinely overlap by a few milliseconds where speakers change,
    and a pasted transcript may carry no timings at all. Rather than reject those,
    nudge them into shape here so the stored timeline is always seekable.
    """
    segments.sort(key=lambda segment: (segment.start_ms, segment.end_ms))
    previous_end = 0
    for segment in segments:
        if segment.start_ms < previous_end:
            segment.start_ms = previous_end
        if segment.end_ms <= segment.start_ms:
            segment.end_ms = segment.start_ms + _estimate_ms(segment.text)
        previous_end = segment.end_ms
    return segments


def _split_speaker(text: str) -> tuple[str | None, str]:
    if match := _SPEAKER_PREFIX.match(text):
        return match.group(1).strip(), match.group(2).strip()
    return None, text


def parse_vtt(raw: str) -> ParsedTranscript:
    """WebVTT. Speaker comes from a `<v Name>` voice span or a `Name:` prefix."""
    text = raw.replace("\r\n", "\n").replace("\r", "\n")
    segments: list[ParsedSegment] = []

    for block in re.split(r"\n\s*\n", text):
        lines = [line for line in block.split("\n") if line.strip()]
        cue_index = next((i for i, line in enumerate(lines) if "-->" in line), None)
        if cue_index is None:
            continue  # the WEBVTT header, a NOTE, or a STYLE block

        cue = _CUE.match(lines[cue_index].strip())
        if not cue:
            continue

        payload = " ".join(lines[cue_index + 1 :]).strip()
        if not payload:
            continue

        speaker = None
        if voice := _VOICE.search(payload):
            speaker = voice.group(1).strip()
        payload = _ANY_TAG.sub("", payload).strip()
        if speaker is None:
            speaker, payload = _split_speaker(payload)
        if not payload:
            continue

        segments.append(
            ParsedSegment(
                speaker_label=speaker,
                start_ms=_timestamp_to_ms(cue.group("start")),
                end_ms=_timestamp_to_ms(cue.group("end")),
                text=payload,
            )
        )

    if not segments:
        raise TranscriptParseError("No cues found in the WebVTT input")
    _normalise(segments)
    return ParsedTranscript(segments, max(segment.end_ms for segment in segments))


def parse_text(raw: str) -> ParsedTranscript:
    """Plain text: one utterance per line, optionally `[mm:ss]` and/or `Name:`.

    Lines without a timestamp are timed from their word count and laid end to end,
    which is what makes a pasted transcript playable rather than a wall of text.
    """
    segments: list[ParsedSegment] = []
    cursor = 0

    for line in raw.replace("\r\n", "\n").replace("\r", "\n").split("\n"):
        line = line.strip()
        if not line:
            continue

        start_ms: int | None = None
        if stamp := _LEADING_STAMP.match(line):
            start_ms = _timestamp_to_ms(stamp.group(1))
            line = line[stamp.end() :].strip()

        speaker, line = _split_speaker(line)
        if not line:
            continue

        start_ms = cursor if start_ms is None else max(start_ms, 0)
        end_ms = start_ms + _estimate_ms(line)
        segments.append(ParsedSegment(speaker, start_ms, end_ms, line))
        cursor = end_ms

    if not segments:
        raise TranscriptParseError("No transcript lines found in the input")
    _normalise(segments)
    return ParsedTranscript(segments, max(segment.end_ms for segment in segments))


def parse_fixture_segments(fixture: dict[str, Any]) -> ParsedTranscript:
    """The seed fixture shape, which the upload endpoint also accepts as `.json`."""
    raw_segments = fixture.get("segments")
    if not isinstance(raw_segments, list) or not raw_segments:
        raise TranscriptParseError("JSON transcript has no `segments` array")

    try:
        segments = [
            ParsedSegment(
                speaker_label=(spec.get("speaker") or None),
                start_ms=int(spec["start_ms"]),
                end_ms=int(spec["end_ms"]),
                text=str(spec["text"]).strip(),
            )
            for spec in raw_segments
        ]
    except (KeyError, TypeError, ValueError) as exc:
        raise TranscriptParseError(f"Malformed segment in JSON transcript: {exc}") from exc

    segments = [segment for segment in segments if segment.text]
    if not segments:
        raise TranscriptParseError("JSON transcript contains no non-empty segments")

    _normalise(segments)
    last_end = max(segment.end_ms for segment in segments)
    # Trust an explicit duration only when it actually covers the content — the
    # same invariant the seed loader enforces, applied to untrusted input.
    declared = fixture.get("duration_ms")
    duration = int(declared) if isinstance(declared, int) and declared >= last_end else last_end
    return ParsedTranscript(segments, duration)


def parse(raw: str, *, fmt: TranscriptFormat | None = None) -> ParsedTranscript:
    """Sniff the format unless the caller knows it from the filename, then parse."""
    fmt = fmt or detect_format(raw)
    if fmt == "vtt":
        return parse_vtt(raw)
    if fmt == "json":
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise TranscriptParseError(f"Invalid JSON: {exc}") from exc
        if isinstance(payload, list):
            payload = {"segments": payload}
        if not isinstance(payload, dict):
            raise TranscriptParseError("JSON transcript must be an object or an array")
        return parse_fixture_segments(payload)
    return parse_text(raw)
