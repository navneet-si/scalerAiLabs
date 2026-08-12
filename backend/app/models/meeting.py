from __future__ import annotations

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin
from app.models.participant import Participant, meeting_participants
from app.models.tag import Tag, meeting_tags

if TYPE_CHECKING:
    from app.models.action_item import ActionItem
    from app.models.summary import Chapter, Summary
    from app.models.transcript import Speaker, TranscriptSegment


class MeetingSource(str, enum.Enum):
    SEED = "seed"
    UPLOAD = "upload"
    MANUAL = "manual"


class MeetingStatus(str, enum.Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"


class Meeting(Base, TimestampMixin):
    __tablename__ = "meetings"
    __table_args__ = (Index("ix_meetings_meeting_date", "meeting_date"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    meeting_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    # Duration is stored in milliseconds so it shares units with every timestamp.
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    audio_url: Mapped[str | None] = mapped_column(String(512))
    source: Mapped[MeetingSource] = mapped_column(
        Enum(MeetingSource, native_enum=False, length=16),
        nullable=False,
        default=MeetingSource.MANUAL,
    )
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, native_enum=False, length=16),
        nullable=False,
        default=MeetingStatus.COMPLETED,
    )
    organizer_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )

    organizer: Mapped[Participant | None] = relationship(foreign_keys=[organizer_id])
    participants: Mapped[list[Participant]] = relationship(
        secondary=meeting_participants, back_populates="meetings"
    )
    tags: Mapped[list[Tag]] = relationship(secondary=meeting_tags, back_populates="meetings")

    # Deleting a meeting must take its transcript and derived content with it.
    speakers: Mapped[list[Speaker]] = relationship(
        back_populates="meeting", cascade="all, delete-orphan"
    )
    segments: Mapped[list[TranscriptSegment]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.start_ms",
    )
    summary: Mapped[Summary | None] = relationship(
        back_populates="meeting", cascade="all, delete-orphan", uselist=False
    )
    chapters: Mapped[list[Chapter]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="Chapter.start_ms",
    )
    action_items: Mapped[list[ActionItem]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="ActionItem.position",
    )
