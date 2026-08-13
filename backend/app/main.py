from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app import models  # noqa: F401  -- imported so every mapper is registered
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.routers import action_items, meetings, participants
from app.seed.loader import FixtureError, seed_database
from app.services.transcript_parser import TranscriptParseError

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # SQLite + a single-instance deploy means create_all is enough; there is no
    # migration story to maintain and the schema is versioned with the code.
    Base.metadata.create_all(bind=engine)

    if settings.seed_on_startup:
        with SessionLocal() as db:
            seed_database(db)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

# Production serves both apps from one origin behind nginx, so CORS is only ever
# exercised in local development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(TranscriptParseError)
@app.exception_handler(FixtureError)
def handle_invalid_transcript(_request: Request, exc: Exception) -> JSONResponse:
    """Bad transcript content is a 422, not a 500.

    Both errors mean "the input is well-formed enough to reach us but cannot be
    stored", so they get one handler and the client gets one shape to render.
    """
    return JSONResponse(status_code=422, content={"detail": str(exc)})


app.include_router(meetings.router)
app.include_router(participants.router)
app.include_router(action_items.router)


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
