"""Participant and tag resolution, shared by the seed loader and the write API.

Deduplication lives here rather than in either caller because "is this the same
person?" must answer identically whether a row arrives from a fixture or from an
upload. Two copies of this rule would drift, and the symptom would be duplicate
people quietly breaking the participant filter.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Participant, Tag

# The single mocked logged-in user. Auth is out of scope for this project.
CURRENT_USER_EMAIL = "alex.rivera@northwind.io"

# Assigned round-robin so a new participant is visually distinct from their
# neighbours without the caller having to think about it.
AVATAR_COLORS = (
    "#6366f1",
    "#ec4899",
    "#14b8a6",
    "#f59e0b",
    "#8b5cf6",
    "#ef4444",
    "#0ea5e9",
    "#22c55e",
)


def _next_color(db: Session) -> str:
    count = db.scalar(select(func.count()).select_from(Participant)) or 0
    return AVATAR_COLORS[count % len(AVATAR_COLORS)]


def get_or_create_participant(db: Session, spec: dict[str, Any]) -> Participant:
    """Participants are shared across meetings, matched on email.

    Email is the identity key because it is the only field that is actually
    stable — display names vary between a calendar invite and a transcript. When
    there is no email (a hand-typed attendee) we fall back to an exact name match
    so the common case still deduplicates.
    """
    email = spec.get("email")
    if email:
        existing = db.scalar(select(Participant).where(Participant.email == email))
        if existing:
            return existing
    elif name := spec.get("name"):
        existing = db.scalar(
            select(Participant).where(Participant.email.is_(None), Participant.name == name)
        )
        if existing:
            return existing

    participant = Participant(
        name=spec["name"],
        email=email,
        avatar_color=spec.get("color") or _next_color(db),
        is_current_user=email == CURRENT_USER_EMAIL,
    )
    db.add(participant)
    db.flush()
    return participant


def get_or_create_tag(db: Session, name: str) -> Tag:
    existing = db.scalar(select(Tag).where(Tag.name == name))
    if existing:
        return existing
    tag = Tag(name=name)
    db.add(tag)
    db.flush()
    return tag
