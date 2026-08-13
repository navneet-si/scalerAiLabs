"""Action item CRUD.

Small enough to sit in a router, but kept here so the notes panel's mutations go
through the same layer as everything else and stay testable without a client.
"""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import ActionItem, Participant
from app.schemas.action_item import ActionItemCreate, ActionItemUpdate
from app.services.ingest_service import next_action_item_position


def get(db: Session, item_id: int) -> ActionItem | None:
    return db.scalar(
        select(ActionItem)
        .where(ActionItem.id == item_id)
        .options(selectinload(ActionItem.assignee))
    )


def _check_assignee(db: Session, assignee_id: int | None) -> None:
    if assignee_id is not None and db.get(Participant, assignee_id) is None:
        raise LookupError(f"Participant {assignee_id} does not exist")


def create(db: Session, meeting_id: int, payload: ActionItemCreate) -> ActionItem:
    _check_assignee(db, payload.assignee_id)

    item = ActionItem(
        meeting_id=meeting_id,
        text=payload.text,
        assignee_id=payload.assignee_id,
        due_date=payload.due_date,
        source_segment_id=payload.source_segment_id,
        # Appended to the end of the meeting's list; the UI reorders by patching.
        position=next_action_item_position(db, meeting_id),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update(db: Session, item: ActionItem, payload: ActionItemUpdate) -> ActionItem:
    """Patch semantics: only fields the client actually sent are touched.

    `exclude_unset` rather than `exclude_none` matters here — clearing an assignee
    or a due date means sending an explicit null, which must be distinguishable
    from omitting the field.
    """
    fields = payload.model_dump(exclude_unset=True)
    if "assignee_id" in fields:
        _check_assignee(db, fields["assignee_id"])

    for attribute, value in fields.items():
        setattr(item, attribute, value)

    db.commit()
    db.refresh(item)
    return item


def delete(db: Session, item: ActionItem) -> None:
    db.delete(item)
    db.commit()
