from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.action_item import ActionItemCreate, ActionItemRead, ActionItemUpdate
from app.services import action_item_service, meeting_service

router = APIRouter(prefix="/api", tags=["action items"])


def _load(db: Session, item_id: int):
    item = action_item_service.get(db, item_id)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Action item not found")
    return item


@router.post(
    "/meetings/{meeting_id}/action-items",
    response_model=ActionItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(
    meeting_id: int,
    payload: ActionItemCreate,
    db: Session = Depends(get_db),
) -> ActionItemRead:
    if meeting_service.get_meeting(db, meeting_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    try:
        item = action_item_service.create(db, meeting_id, payload)
    except LookupError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return ActionItemRead.model_validate(item)


@router.patch("/action-items/{item_id}", response_model=ActionItemRead)
def update_action_item(
    item_id: int,
    payload: ActionItemUpdate,
    db: Session = Depends(get_db),
) -> ActionItemRead:
    """Also serves the completion toggle — the checkbox patches `is_done` alone."""
    item = _load(db, item_id)
    try:
        item = action_item_service.update(db, item, payload)
    except LookupError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    return ActionItemRead.model_validate(item)


@router.delete("/action-items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_action_item(item_id: int, db: Session = Depends(get_db)) -> Response:
    action_item_service.delete(db, _load(db, item_id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
