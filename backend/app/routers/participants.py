from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Participant, Tag
from app.schemas.participant import ParticipantRead, TagRead

router = APIRouter(prefix="/api", tags=["people"])


@router.get("/participants", response_model=list[ParticipantRead])
def list_participants(db: Session = Depends(get_db)) -> list[ParticipantRead]:
    """Powers the participant filter in the library."""
    participants = db.scalars(select(Participant).order_by(Participant.name)).all()
    return [ParticipantRead.model_validate(p) for p in participants]


@router.get("/me", response_model=ParticipantRead)
def get_current_user(db: Session = Depends(get_db)) -> ParticipantRead:
    """Auth is out of scope — one seeded participant is flagged as the logged-in user."""
    user = db.scalar(select(Participant).where(Participant.is_current_user.is_(True)))
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No current user configured")
    return ParticipantRead.model_validate(user)


@router.get("/tags", response_model=list[TagRead])
def list_tags(db: Session = Depends(get_db)) -> list[TagRead]:
    tags = db.scalars(select(Tag).order_by(Tag.name)).all()
    return [TagRead.model_validate(tag) for tag in tags]
