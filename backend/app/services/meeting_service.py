"""Query logic for the meetings library and notebook.

Kept out of the routers so the HTTP layer stays thin and the query behaviour is
testable on its own.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from sqlalchemy import Select, case, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    ActionItem,
    Meeting,
    Participant,
    Summary,
    Tag,
    TranscriptSegment,
    meeting_participants,
    meeting_tags,
)

SortOrder = Literal["recent", "oldest", "title", "duration"]

_SORTS = {
    "recent": Meeting.meeting_date.desc(),
    "oldest": Meeting.meeting_date.asc(),
    "title": Meeting.title.asc(),
    "duration": Meeting.duration_ms.desc(),
}


def _apply_filters(
    stmt: Select,
    *,
    search: str | None,
    participant_id: int | None,
    tag: str | None,
    date_from: datetime | None,
    date_to: datetime | None,
) -> Select:
    if search:
        pattern = f"%{search}%"
        # Searching the library matches a meeting by its own text or by who was in
        # it — "find the call with Priya" is as common as searching by title.
        participant_match = (
            select(meeting_participants.c.meeting_id)
            .join(Participant, Participant.id == meeting_participants.c.participant_id)
            .where(Participant.name.ilike(pattern))
        )
        stmt = stmt.where(
            or_(
                Meeting.title.ilike(pattern),
                Meeting.description.ilike(pattern),
                Meeting.id.in_(participant_match),
            )
        )

    if participant_id is not None:
        stmt = stmt.where(
            Meeting.id.in_(
                select(meeting_participants.c.meeting_id).where(
                    meeting_participants.c.participant_id == participant_id
                )
            )
        )

    if tag:
        stmt = stmt.where(
            Meeting.id.in_(
                select(meeting_tags.c.meeting_id)
                .join(Tag, Tag.id == meeting_tags.c.tag_id)
                .where(Tag.name == tag)
            )
        )

    if date_from is not None:
        stmt = stmt.where(Meeting.meeting_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(Meeting.meeting_date <= date_to)

    return stmt


def _counts_by_meeting(db: Session, meeting_ids: list[int]) -> dict[int, dict[str, int]]:
    """One aggregate query for the whole page instead of per-row lookups."""
    if not meeting_ids:
        return {}

    rows = db.execute(
        select(
            ActionItem.meeting_id,
            func.count(ActionItem.id),
            func.sum(case((ActionItem.is_done.is_(False), 1), else_=0)),
        )
        .where(ActionItem.meeting_id.in_(meeting_ids))
        .group_by(ActionItem.meeting_id)
    ).all()

    counts = {
        meeting_id: {"total": total or 0, "open": int(open_count or 0)}
        for meeting_id, total, open_count in rows
    }

    summarised = set(
        db.scalars(select(Summary.meeting_id).where(Summary.meeting_id.in_(meeting_ids))).all()
    )
    for meeting_id in meeting_ids:
        entry = counts.setdefault(meeting_id, {"total": 0, "open": 0})
        entry["has_summary"] = meeting_id in summarised
    return counts


def list_meetings(
    db: Session,
    *,
    search: str | None = None,
    participant_id: int | None = None,
    tag: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    sort: SortOrder = "recent",
    limit: int = 20,
    offset: int = 0,
) -> tuple[list[Meeting], int]:
    """Returns the page of meetings and the unpaginated total."""
    filters = dict(
        search=search,
        participant_id=participant_id,
        tag=tag,
        date_from=date_from,
        date_to=date_to,
    )

    total = db.scalar(
        _apply_filters(select(func.count()).select_from(Meeting), **filters)
    ) or 0

    stmt = (
        _apply_filters(select(Meeting), **filters)
        .options(selectinload(Meeting.participants), selectinload(Meeting.tags))
        .order_by(_SORTS.get(sort, _SORTS["recent"]))
        .limit(limit)
        .offset(offset)
    )
    meetings = list(db.scalars(stmt).unique().all())

    counts = _counts_by_meeting(db, [meeting.id for meeting in meetings])
    for meeting in meetings:
        entry = counts.get(meeting.id, {})
        # Attached for the response schema; not persisted columns.
        meeting.action_item_count = entry.get("total", 0)
        meeting.open_action_item_count = entry.get("open", 0)
        meeting.has_summary = entry.get("has_summary", False)

    return meetings, total


def get_meeting(db: Session, meeting_id: int) -> Meeting | None:
    return db.scalar(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.participants),
            selectinload(Meeting.tags),
            selectinload(Meeting.speakers),
            selectinload(Meeting.chapters),
            selectinload(Meeting.summary),
            selectinload(Meeting.action_items).selectinload(ActionItem.assignee),
            selectinload(Meeting.organizer),
        )
    )


def get_transcript(db: Session, meeting_id: int) -> list[TranscriptSegment]:
    return list(
        db.scalars(
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.start_ms)
        ).all()
    )
