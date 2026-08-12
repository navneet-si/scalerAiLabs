"""Loads meeting fixtures from JSON into the database.

The fixture format is deliberately the same shape the transcript-upload endpoint
accepts, so seeding and uploading exercise the same parsing rules.
"""

from __future__ import annotations

import json
from datetime import datetime, time, timedelta, timezone
from pathlib import Path
from typing import Any

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
    Tag,
    TranscriptSegment,
)

DATA_DIR = Path(__file__).parent / "data"

# The single mocked logged-in user. Auth is out of scope for this project.
CURRENT_USER_EMAIL = "alex.rivera@northwind.io"


class FixtureError(ValueError):
    """Raised when a fixture violates an invariant the UI depends on."""


def validate_fixture(fixture: dict[str, Any], name: str) -> None:
    """Fail loudly on fixtures whose timeline would break the player.

    The seek bar maps `duration_ms` onto the transcript, so a duration that does
    not cover the segments produces dead space or unreachable lines. Chapters
    drive the outline, so they must land inside the timeline too.
    """
    segments = fixture.get("segments") or []
    if not segments:
        raise FixtureError(f"{name}: fixture has no segments")

    duration_ms = fixture["duration_ms"]
    last_end = max(segment["end_ms"] for segment in segments)
    if duration_ms < last_end:
        raise FixtureError(
            f"{name}: duration_ms ({duration_ms}) is shorter than the last "
            f"segment end ({last_end})"
        )

    previous_end = 0
    for index, segment in enumerate(segments):
        if segment["start_ms"] >= segment["end_ms"]:
            raise FixtureError(f"{name}: segment {index} ends before it starts")
        if segment["start_ms"] < previous_end:
            raise FixtureError(f"{name}: segment {index} overlaps the previous one")
        previous_end = segment["end_ms"]

    speaker_names = {segment["speaker"] for segment in segments}
    known = {participant["name"] for participant in fixture["participants"]}
    if unknown := speaker_names - known:
        raise FixtureError(f"{name}: segments reference unlisted speakers {sorted(unknown)}")

    for chapter in fixture.get("chapters", []):
        if chapter["start_ms"] > duration_ms:
            raise FixtureError(f"{name}: chapter '{chapter['title']}' starts after the meeting ends")
        if chapter.get("end_ms") is not None and chapter["end_ms"] > duration_ms:
            raise FixtureError(f"{name}: chapter '{chapter['title']}' ends after the meeting ends")


def _get_or_create_participant(db: Session, spec: dict[str, Any]) -> Participant:
    """Participants are shared across meetings, matched on email."""
    email = spec.get("email")
    if email:
        existing = db.scalar(select(Participant).where(Participant.email == email))
        if existing:
            return existing

    participant = Participant(
        name=spec["name"],
        email=email,
        avatar_color=spec.get("color", "#6366f1"),
        is_current_user=email == CURRENT_USER_EMAIL,
    )
    db.add(participant)
    db.flush()
    return participant


def _get_or_create_tag(db: Session, name: str) -> Tag:
    existing = db.scalar(select(Tag).where(Tag.name == name))
    if existing:
        return existing
    tag = Tag(name=name)
    db.add(tag)
    db.flush()
    return tag


def _meeting_datetime(fixture: dict[str, Any]) -> datetime:
    """Fixtures store `days_ago` so the library always looks current."""
    hour, minute = (int(part) for part in fixture.get("time", "10:00").split(":"))
    day = datetime.now(timezone.utc) - timedelta(days=fixture["days_ago"])
    return datetime.combine(day.date(), time(hour, minute), tzinfo=timezone.utc)


def load_fixture(db: Session, fixture: dict[str, Any], name: str) -> Meeting:
    validate_fixture(fixture, name)

    participants = {
        spec["name"]: _get_or_create_participant(db, spec)
        for spec in fixture["participants"]
    }
    organizer = participants.get(fixture.get("organizer", ""))

    meeting = Meeting(
        title=fixture["title"],
        description=fixture.get("description"),
        meeting_date=_meeting_datetime(fixture),
        duration_ms=fixture["duration_ms"],
        audio_url=fixture.get("audio_url"),
        source=MeetingSource.SEED,
        organizer_id=organizer.id if organizer else None,
    )
    # Add before wiring relationships: assigning a collection on a transient object
    # leaves SQLAlchemy unable to cascade the backref, which it warns about.
    db.add(meeting)
    meeting.participants = list(participants.values())
    meeting.tags = [_get_or_create_tag(db, tag) for tag in fixture.get("tags", [])]
    db.flush()

    # One speaker per participant: seeded transcripts are already diarized to a
    # named person, unlike an uploaded VTT where speakers may be unresolved.
    speakers: dict[str, Speaker] = {}
    for order, (participant_name, participant) in enumerate(participants.items()):
        speaker = Speaker(
            meeting_id=meeting.id,
            label=participant_name,
            color=participant.avatar_color,
            display_order=order,
            participant_id=participant.id,
        )
        db.add(speaker)
        speakers[participant_name] = speaker
    db.flush()

    segments_by_start: dict[int, TranscriptSegment] = {}
    for seq, spec in enumerate(fixture["segments"]):
        segment = TranscriptSegment(
            meeting_id=meeting.id,
            speaker_id=speakers[spec["speaker"]].id,
            seq=seq,
            start_ms=spec["start_ms"],
            end_ms=spec["end_ms"],
            text=spec["text"],
        )
        db.add(segment)
        segments_by_start[spec["start_ms"]] = segment
    db.flush()

    if summary_spec := fixture.get("summary"):
        db.add(
            Summary(
                meeting_id=meeting.id,
                overview=summary_spec.get("overview", ""),
                keywords=summary_spec.get("keywords", []),
                bullet_notes=summary_spec.get("bullet_notes", []),
                generated_by="seed",
            )
        )

    for position, spec in enumerate(fixture.get("chapters", [])):
        db.add(
            Chapter(
                meeting_id=meeting.id,
                title=spec["title"],
                gist=spec.get("gist"),
                start_ms=spec["start_ms"],
                end_ms=spec.get("end_ms"),
                position=position,
            )
        )

    for position, spec in enumerate(fixture.get("action_items", [])):
        assignee = participants.get(spec.get("assignee", ""))
        due_date = None
        if (due_in_days := spec.get("due_in_days")) is not None:
            due_date = (meeting.meeting_date + timedelta(days=due_in_days)).date()
        db.add(
            ActionItem(
                meeting_id=meeting.id,
                text=spec["text"],
                assignee_id=assignee.id if assignee else None,
                is_done=spec.get("is_done", False),
                due_date=due_date,
                position=position,
            )
        )

    return meeting


def seed_database(db: Session, *, force: bool = False) -> int:
    """Load every fixture. No-op when meetings already exist, so it is safe on boot."""
    if not force and db.scalar(select(func.count()).select_from(Meeting)):
        return 0

    loaded = 0
    for path in sorted(DATA_DIR.glob("*.json")):
        fixture = json.loads(path.read_text(encoding="utf-8"))
        load_fixture(db, fixture, path.name)
        loaded += 1

    db.commit()
    return loaded
