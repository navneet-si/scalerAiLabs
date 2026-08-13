from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401  -- imported so every mapper is registered
from app.core.config import get_settings
from app.core.database import Base, SessionLocal, engine
from app.routers import meetings, participants
from app.seed.loader import seed_database

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


app.include_router(meetings.router)
app.include_router(participants.router)


@app.get("/api/health", tags=["system"])
def health() -> dict[str, str]:
    return {"status": "ok"}
