from datetime import date

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel
from app.schemas.participant import ParticipantRead


class ActionItemRead(ORMModel):
    id: int
    meeting_id: int
    text: str
    is_done: bool
    due_date: date | None = None
    position: int
    assignee: ParticipantRead | None = None
    source_segment_id: int | None = None


class ActionItemCreate(BaseModel):
    text: str = Field(min_length=1)
    assignee_id: int | None = None
    due_date: date | None = None
    source_segment_id: int | None = None


class ActionItemUpdate(BaseModel):
    """Every field optional — the UI patches one attribute at a time."""

    text: str | None = Field(default=None, min_length=1)
    assignee_id: int | None = None
    is_done: bool | None = None
    due_date: date | None = None
    position: int | None = None
