from datetime import datetime

from pydantic import BaseModel, Field

from app.models.meeting import MeetingSource, MeetingStatus
from app.schemas.action_item import ActionItemRead
from app.schemas.common import ORMModel
from app.schemas.participant import ParticipantCreate, ParticipantRead, TagRead
from app.schemas.summary import ChapterRead, SummaryRead
from app.schemas.transcript import SpeakerRead


class MeetingListItem(ORMModel):
    """The library row. Deliberately excludes transcript segments — a list of 10
    meetings would otherwise ship thousands of lines the row never renders."""

    id: int
    title: str
    description: str | None = None
    meeting_date: datetime
    duration_ms: int
    source: MeetingSource
    status: MeetingStatus
    participants: list[ParticipantRead]
    tags: list[TagRead]
    action_item_count: int = 0
    open_action_item_count: int = 0
    has_summary: bool = False


class MeetingDetail(ORMModel):
    """Everything the notebook page needs except the transcript itself, which is
    fetched separately so the summary panel can render before it arrives."""

    id: int
    title: str
    description: str | None = None
    meeting_date: datetime
    duration_ms: int
    audio_url: str | None = None
    source: MeetingSource
    status: MeetingStatus
    created_at: datetime
    updated_at: datetime
    organizer: ParticipantRead | None = None
    participants: list[ParticipantRead]
    tags: list[TagRead]
    speakers: list[SpeakerRead]
    summary: SummaryRead | None = None
    chapters: list[ChapterRead]
    action_items: list[ActionItemRead]


class MeetingCreate(BaseModel):
    """Create by form or by pasting a transcript.

    `transcript_text` accepts plain text or WebVTT; the parser picks the format.
    """

    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    meeting_date: datetime | None = None
    participants: list[ParticipantCreate] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    transcript_text: str | None = None
    generate_summary: bool = True


class MeetingUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    meeting_date: datetime | None = None
    participant_ids: list[int] | None = None
    tags: list[str] | None = None
