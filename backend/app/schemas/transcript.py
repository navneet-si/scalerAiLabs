from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class SpeakerRead(ORMModel):
    id: int
    label: str
    color: str
    display_order: int
    participant_id: int | None = None


class SegmentRead(ORMModel):
    id: int
    seq: int
    start_ms: int
    end_ms: int
    text: str
    speaker_id: int | None = None


class TranscriptRead(BaseModel):
    meeting_id: int
    duration_ms: int
    speakers: list[SpeakerRead]
    segments: list[SegmentRead]


class SegmentUpdate(BaseModel):
    """Transcript editing is limited to correcting the text of a line."""

    text: str = Field(min_length=1)


class SegmentMatch(ORMModel):
    """A transcript hit returned by global search."""

    id: int
    meeting_id: int
    start_ms: int
    text: str
    speaker_label: str | None = None


class GlobalSearchResult(BaseModel):
    meeting_id: int
    meeting_title: str
    meeting_date: str
    match_count: int
    matches: list[SegmentMatch]
