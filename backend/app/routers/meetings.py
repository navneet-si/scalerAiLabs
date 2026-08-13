from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Meeting
from app.schemas.common import Page
from app.schemas.meeting import MeetingCreate, MeetingDetail, MeetingListItem, MeetingUpdate
from app.schemas.transcript import TranscriptRead
from app.services import ingest_service, meeting_service
from app.services.transcript_parser import TranscriptParseError

router = APIRouter(prefix="/api/meetings", tags=["meetings"])

MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _load(db: Session, meeting_id: int) -> Meeting:
    meeting = meeting_service.get_meeting(db, meeting_id)
    if meeting is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return meeting


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


@router.post("", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(payload: MeetingCreate, db: Session = Depends(get_db)) -> MeetingDetail:
    """Create by form, or by pasting a transcript into `transcript_text`."""
    if payload.generate_summary and not (payload.transcript_text or "").strip():
        # Nothing to summarise; say so rather than silently creating an empty summary.
        payload = payload.model_copy(update={"generate_summary": False})
    try:
        meeting = ingest_service.create_meeting(db, payload)
    except TranscriptParseError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return MeetingDetail.model_validate(_load(db, meeting.id))


# Declared before `/{meeting_id}` — FastAPI matches routes in order, and a literal
# path registered after a parameterised one is never reached.
@router.post("/upload", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
async def upload_transcript(
    file: UploadFile = File(..., description=".vtt, .json or .txt transcript"),
    title: str | None = Form(default=None),
    generate_summary: bool = Form(default=True),
    db: Session = Depends(get_db),
) -> MeetingDetail:
    payload = await file.read()
    if len(payload) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Transcript exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)}MB",
        )
    try:
        raw = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Transcript must be UTF-8 text",
        ) from exc

    try:
        meeting = ingest_service.ingest_upload(
            db,
            raw=raw,
            filename=file.filename,
            title=title,
            generate_summary=generate_summary,
        )
    except TranscriptParseError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return MeetingDetail.model_validate(_load(db, meeting.id))


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> MeetingDetail:
    return MeetingDetail.model_validate(_load(db, meeting_id))


@router.patch("/{meeting_id}", response_model=MeetingDetail)
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
) -> MeetingDetail:
    meeting = _load(db, meeting_id)
    try:
        ingest_service.update_meeting(db, meeting, payload)
    except LookupError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return MeetingDetail.model_validate(_load(db, meeting_id))


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)) -> Response:
    """Cascades to the transcript, summary, chapters and action items.

    Participants are shared across meetings and deliberately survive.
    """
    ingest_service.delete_meeting(db, _load(db, meeting_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{meeting_id}/transcript", response_model=TranscriptRead)
def get_transcript(meeting_id: int, db: Session = Depends(get_db)) -> TranscriptRead:
    """Served separately from the meeting so the notes panel can render first."""
    meeting = _load(db, meeting_id)
    segments = meeting_service.get_transcript(db, meeting_id)
    return TranscriptRead.model_validate(
        {
            "meeting_id": meeting.id,
            "duration_ms": meeting.duration_ms,
            "speakers": meeting.speakers,
            "segments": segments,
        }
    )
