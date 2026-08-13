from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Fireflies Clone API"
    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'app.db'}"

    # Single-origin deploy needs no CORS, but local dev runs on two ports.
    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Seeded meetings are re-created only when the meetings table is empty.
    seed_on_startup: bool = True

    # LLM summarisation. Optional by design: with no key the app falls back to the
    # deterministic extractive summariser, so a fresh clone runs green offline.
    # Any OpenAI-compatible endpoint works; Groq is the default because it is fast
    # and has a usable free tier.
    llm_api_key: str | None = None
    llm_base_url: str = "https://api.groq.com/openai/v1"
    llm_model: str = "llama-3.3-70b-versatile"
    llm_timeout_seconds: float = 45.0

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.database_url.startswith("sqlite:///"):
        db_path = Path(settings.database_url.removeprefix("sqlite:///"))
        db_path.parent.mkdir(parents=True, exist_ok=True)
    return settings
