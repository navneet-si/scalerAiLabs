"""Write paths for meetings: create, update, delete and transcript ingestion.

Kept apart from `meeting_service` (which is read-only query logic) because the
two have different concerns: reads optimise for shape and N+1 avoidance, writes
for validation and correct materialisation of a transcript into rows.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    ActionItem,
    Chapter,
    Meeting,
    MeetingSource,
    Participant,
    Speaker,
    Summary,
    TranscriptSegment,
)
from app.schemas.meeting import MeetingCreate, MeetingUpdate
from app.services import summarizer
from app.services.people_service import get_or_create_participant, get_or_create_tag
from app.services import transcript_parser
from app.services.transcript_parser import ParsedTranscript, TranscriptFormat

SPEAKER_PALETTE = (
    "#6366f1",
    "#ec4899",
    "#14b8a6",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#0ea5e9",
    "#22c55e",
)

_EXTENSION_FORMATS: dict[str, TranscriptFormat] = {
    "vtt": "vtt",
    "webvtt": "vtt",
    "json": "json",
    "txt": "text",
    "text": "text",
    "md": "text",
}


def _as_utc(value: datetime | None) -> datetime:
    """Normalise to tz-aware UTC.

    Seeded rows are written tz-aware; a `meeting_date` posted as a naive string
    would otherwise sort and date-filter inconsistently against them, which shows
    up as the library silently omitting newly created meetings.
    """
    if value is None:
        return datetime.now(timezone.utc)
    return value.astimezone(timezone.utc) if value.tzinfo else value.replace(tzinfo=timezone.utc)


def format_for_filename(filename: str | None) -> TranscriptFormat | None:
    """Trust the extension when there is one; otherwise let the parser sniff."""
    if not filename or "." not in filename:
        return None
    return _EXTENSION_FORMATS.get(filename.rsplit(".", 1)[-1].lower())


def _resolve_speakers(
    db: Session,
    meeting: Meeting,
    parsed: ParsedTranscript,
    known: dict[str, Participant],
) -> dict[str, Speaker]:
    """Create one Speaker per distinct label, linking it to a person when we can.

    A label that matches a participant name resolves to that participant; an
    unresolved label ("Speaker 1" from a VTT) becomes a Speaker with a null
    `participant_id` rather than a fabricated Participant. Inventing people here
    would pollute `/api/participants` and break the library's participant filter.
    """
    lookup = {name.casefold(): participant for name, participant in known.items()}
    speakers: dict[str, Speaker] = {}

    for order, label in enumerate(parsed.speaker_labels):
        participant = lookup.get(label.casefold())
        speaker = Speaker(
            meeting_id=meeting.id,
            label=label,
            color=participant.avatar_color if participant else SPEAKER_PALETTE[order % len(SPEAKER_PALETTE)],
            display_order=order,
            participant_id=participant.id if participant else None,
        )
        db.add(speaker)
        speakers[label] = speaker

    db.flush()
    return speakers


def _write_transcript(
    db: Session,
    meeting: Meeting,
    parsed: ParsedTranscript,
    known: dict[str, Participant],
) -> dict[str, Speaker]:
    speakers = _resolve_speakers(db, meeting, parsed, known)
    for seq, segment in enumerate(parsed.segments):
        db.add(
            TranscriptSegment(
                meeting_id=meeting.id,
                speaker_id=speakers[segment.speaker_label].id if segment.speaker_label else None,
                seq=seq,
                start_ms=segment.start_ms,
                end_ms=segment.end_ms,
                text=segment.text,
            )
        )
    db.flush()
    return speakers


def _write_summary(
    db: Session,
    meeting: Meeting,
    parsed: ParsedTranscript,
    speakers: dict[str, Speaker],
) -> None:
    """Generate and persist notes. `generated_by` records which engine produced them."""
    generated = summarizer.generate(meeting.title, parsed.segments, duration_ms=meeting.duration_ms)

    db.add(
        Summary(
            meeting_id=meeting.id,
            overview=generated.overview,
            keywords=generated.keywords,
            bullet_notes=generated.bullet_notes,
            generated_by=generated.generated_by,
        )
    )

    for position, chapter in enumerate(generated.chapters):
        db.add(Chapter(meeting_id=meeting.id, position=position, **chapter))

    for position, item in enumerate(generated.action_items):
        speaker = speakers.get(item["assignee_label"] or "")
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                text=item["text"],
                # Only a resolved speaker yields an assignee; an unresolved label
                # leaves the item unassigned for the user to fill in.
                assignee_id=speaker.participant_id if speaker else None,
                position=position,
            )
        )
    db.flush()


def create_meeting(db: Session, payload: MeetingCreate) -> Meeting:
    """Create by form, or by pasting a transcript into `transcript_text`."""
    parsed: ParsedTranscript | None = None
    if payload.transcript_text and payload.transcript_text.strip():
        parsed = transcript_parser.parse(payload.transcript_text)

    participants = {
        spec.name: get_or_create_participant(db, spec.model_dump(exclude_none=True))
        for spec in payload.participants
    }

    meeting = Meeting(
        title=payload.title,
        description=payload.description,
        meeting_date=_as_utc(payload.meeting_date),
        # A form-created meeting with no transcript has no timeline yet; 0 is a
        # valid empty timeline the player renders as an unseekable bar.
        duration_ms=parsed.duration_ms if parsed else 0,
        source=MeetingSource.MANUAL,
    )
    db.add(meeting)
    meeting.participants = list(participants.values())
    meeting.tags = [get_or_create_tag(db, tag) for tag in payload.tags]
    db.flush()

    if parsed:
        speakers = _write_transcript(db, meeting, parsed, participants)
        if payload.generate_summary:
            _write_summary(db, meeting, parsed, speakers)

    db.commit()
    return meeting


def ingest_upload(
    db: Session,
    *,
    raw: str,
    filename: str | None = None,
    title: str | None = None,
    generate_summary: bool = True,
) -> Meeting:
    """Create a meeting from an uploaded `.vtt`, `.json` or `.txt` transcript.

    A `.json` upload uses the seed fixture shape, so its participant list, tags
    and organizer are honoured. The other formats carry transcript only, and
    their speakers stay unresolved until someone maps them.
    """
    fmt = format_for_filename(filename)
    parsed = transcript_parser.parse(raw, fmt=fmt)

    fixture: dict = {}
    if (fmt or transcript_parser.detect_format(raw)) == "json":
        # Already known to parse — `transcript_parser.parse` decoded it above.
        loaded = json.loads(raw)
        fixture = loaded if isinstance(loaded, dict) else {}

    participants = {
        spec["name"]: get_or_create_participant(db, spec)
        for spec in fixture.get("participants", [])
        if spec.get("name")
    }

    resolved_title = title or fixture.get("title") or _title_from_filename(filename)
    organizer = participants.get(fixture.get("organizer", ""))

    meeting = Meeting(
        title=resolved_title,
        description=fixture.get("description"),
        meeting_date=_as_utc(None),
        duration_ms=parsed.duration_ms,
        audio_url=fixture.get("audio_url"),
        source=MeetingSource.UPLOAD,
        organizer_id=organizer.id if organizer else None,
    )
    db.add(meeting)
    meeting.participants = list(participants.values())
    meeting.tags = [get_or_create_tag(db, tag) for tag in fixture.get("tags", [])]
    db.flush()

    speakers = _write_transcript(db, meeting, parsed, participants)
    if generate_summary:
        _write_summary(db, meeting, parsed, speakers)

    db.commit()
    return meeting


def _title_from_filename(filename: str | None) -> str:
    if not filename:
        return "Untitled meeting"
    stem = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").strip()
    return stem[:255].title() if stem else "Untitled meeting"


def update_meeting(db: Session, meeting: Meeting, payload: MeetingUpdate) -> Meeting:
    """Patch metadata. Unset fields are left alone rather than nulled."""
    fields = payload.model_dump(exclude_unset=True)

    for attribute in ("title", "description"):
        if attribute in fields:
            setattr(meeting, attribute, fields[attribute])

    if "meeting_date" in fields and fields["meeting_date"] is not None:
        meeting.meeting_date = _as_utc(fields["meeting_date"])

    if (participant_ids := fields.get("participant_ids")) is not None:
        found = list(db.scalars(select(Participant).where(Participant.id.in_(participant_ids))).all())
        if len(found) != len(set(participant_ids)):
            raise LookupError("One or more participant ids do not exist")
        meeting.participants = found

    if (tags := fields.get("tags")) is not None:
        meeting.tags = [get_or_create_tag(db, tag) for tag in tags]

    db.commit()
    db.refresh(meeting)
    return meeting


def delete_meeting(db: Session, meeting: Meeting) -> None:
    """Cascades to speakers, segments, summary, chapters and action items.

    Participants survive by design — they are shared across meetings, so deleting
    one meeting must not remove a person from the others.
    """
    db.delete(meeting)
    db.commit()


def next_action_item_position(db: Session, meeting_id: int) -> int:
    highest = db.scalar(
        select(func.max(ActionItem.position)).where(ActionItem.meeting_id == meeting_id)
    )
    return 0 if highest is None else highest + 1
