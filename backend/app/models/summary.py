from __future__ import annotations

from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting


class Summary(Base, TimestampMixin):
    """The AI notes panel: overview, keywords, bullet notes.

    Keywords and bullets are display-only lists that are always read as a whole,
    so they live in JSON columns. Anything that needs to be queried or seeked to
    (chapters, action items) gets its own table instead.
    """

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    overview: Mapped[str] = mapped_column(Text, nullable=False, default="")
    keywords: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    bullet_notes: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, default=list
    )
    generated_by: Mapped[str] = mapped_column(String(32), nullable=False, default="seed")

    meeting: Mapped[Meeting] = relationship(back_populates="summary")


class Chapter(Base):
    """A time-stamped outline entry — clicking one seeks the player."""

    __tablename__ = "chapters"
    __table_args__ = (Index("ix_chapters_meeting_start", "meeting_id", "start_ms"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    gist: Mapped[str | None] = mapped_column(Text)
    start_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_ms: Mapped[int | None] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    meeting: Mapped[Meeting] = relationship(back_populates="chapters")
