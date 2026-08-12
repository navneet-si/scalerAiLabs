from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import ORMModel


class ParticipantRead(ORMModel):
    id: int
    name: str
    email: str | None = None
    avatar_color: str
    is_current_user: bool
    initials: str


class ParticipantCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr | None = None
    avatar_color: str | None = None


class TagRead(ORMModel):
    id: int
    name: str
    color: str
