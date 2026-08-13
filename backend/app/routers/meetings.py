from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.common import Page
from app.schemas.meeting import MeetingDetail, MeetingListItem
from app.schemas.transcript import TranscriptRead
from app.services import meeting_service

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.get("", response_model=Page[MeetingListItem])
def list_meetings(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, description="Matches title, description or participant name"),
    participant_id: int | None = None,
    tag: str | None = None,
    date_from: datetime | None = None,
    date_to: datetime | None = None,
    sort: meeting_service.SortOrder = "recent",
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> Page[MeetingListItem]:
    meetings, total = meeting_service.list_meetings(
        db,
        search=search,
        participant_id=participant_id,
        tag=tag,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        limit=limit,
        offset=offset,
    )
    return Page(
        items=[MeetingListItem.model_validate(meeting) for meeting in meetings],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> MeetingDetail:
    meeting = meeting_service.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return MeetingDetail.model_validate(meeting)


@router.get("/{meeting_id}/transcript", response_model=TranscriptRead)
def get_transcript(meeting_id: int, db: Session = Depends(get_db)) -> TranscriptRead:
    """Served separately from the meeting so the notes panel can render first."""
    meeting = meeting_service.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    segments = meeting_service.get_transcript(db, meeting_id)
    return TranscriptRead.model_validate(
        {
            "meeting_id": meeting.id,
            "duration_ms": meeting.duration_ms,
            "speakers": meeting.speakers,
            "segments": segments,
        }
    )
