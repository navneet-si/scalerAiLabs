from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.meeting import Meeting

# A person can attend many meetings; a meeting has many people.
meeting_participants = Table(
    "meeting_participants",
    Base.metadata,
    Column("meeting_id", ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "participant_id",
        ForeignKey("participants.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("role", String(32), nullable=False, server_default="attendee"),
)


class Participant(Base, TimestampMixin):
    """A person who shows up in meetings. Doubles as the single mocked user."""

    __tablename__ = "participants"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    avatar_color: Mapped[str] = mapped_column(String(9), nullable=False, default="#6366f1")
    # Auth is out of scope; exactly one participant is flagged as the logged-in user.
    is_current_user: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    meetings: Mapped[list[Meeting]] = relationship(
        secondary=meeting_participants, back_populates="participants"
    )

    @property
    def initials(self) -> str:
        return "".join(part[0].upper() for part in self.name.split()[:2])
