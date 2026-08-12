from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.meeting import Meeting
    from app.models.participant import Participant


class Speaker(Base):
    """A diarization label ("Speaker 1", "Sarah") scoped to one meeting.

    Kept separate from Participant so a transcript can carry unresolved speakers
    that are later mapped onto a real person.
    """

    __tablename__ = "speakers"
    __table_args__ = (Index("ix_speakers_meeting_id", "meeting_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    color: Mapped[str] = mapped_column(String(9), nullable=False, default="#6366f1")
    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    participant_id: Mapped[int | None] = mapped_column(
        ForeignKey("participants.id", ondelete="SET NULL")
    )

    meeting: Mapped[Meeting] = relationship(back_populates="speakers")
    participant: Mapped[Participant | None] = relationship()
    segments: Mapped[list[TranscriptSegment]] = relationship(back_populates="speaker")


class TranscriptSegment(Base):
    """One spoken line. `start_ms` is the join point between transcript and player."""

    __tablename__ = "transcript_segments"
    __table_args__ = (
        Index("ix_segments_meeting_start", "meeting_id", "start_ms"),
        Index("ix_segments_meeting_seq", "meeting_id", "seq"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    speaker_id: Mapped[int | None] = mapped_column(
        ForeignKey("speakers.id", ondelete="SET NULL")
    )
    seq: Mapped[int] = mapped_column(Integer, nullable=False)
    start_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    end_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)

    meeting: Mapped[Meeting] = relationship(back_populates="segments")
    speaker: Mapped[Speaker | None] = relationship(back_populates="segments")
