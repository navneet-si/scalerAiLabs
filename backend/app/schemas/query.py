from pydantic import BaseModel, Field


class Citation(BaseModel):
    """A transcript line the answer rests on. `start_ms` makes it seekable."""

    meeting_id: int
    meeting_title: str
    start_ms: int
    speaker_label: str | None = None
    text: str


class QueryRequest(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    # Optional scope. Omitted means every meeting.
    meeting_ids: list[int] | None = None


class QueryResponse(BaseModel):
    answer: str
    citations: list[Citation]
    # "keyword" for the offline path, "<provider>:<model>" when an LLM answered.
    answered_by: str
