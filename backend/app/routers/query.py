from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.query import QueryRequest, QueryResponse
from app.services import query_service

router = APIRouter(prefix="/api", tags=["query"])


@router.post("/query", response_model=QueryResponse)
def ask(payload: QueryRequest, db: Session = Depends(get_db)) -> QueryResponse:
    """Ask a question across meetings and get an answer with seekable citations."""
    result = query_service.answer_question(
        db, payload.question, meeting_ids=payload.meeting_ids
    )
    return QueryResponse(**result)
