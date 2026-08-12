from pydantic import BaseModel

from app.schemas.common import ORMModel


class BulletSection(BaseModel):
    """One grouped block of bullet-point notes in the AI notes panel."""

    title: str
    points: list[str]


class SummaryRead(ORMModel):
    id: int
    overview: str
    keywords: list[str]
    bullet_notes: list[BulletSection]
    generated_by: str


class ChapterRead(ORMModel):
    """A time-stamped outline entry. Clicking one seeks the player to `start_ms`."""

    id: int
    title: str
    gist: str | None = None
    start_ms: int
    end_ms: int | None = None
    position: int


class SummaryUpdate(BaseModel):
    overview: str | None = None
    keywords: list[str] | None = None
    bullet_notes: list[BulletSection] | None = None
