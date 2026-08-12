"""Phase 1 verification: schema creates, seeds load, cascades actually cascade.

Run inside the backend image:
    docker run --rm -e DATABASE_URL=sqlite:////tmp/verify.db \
        -v "$PWD/backend/scripts:/srv/scripts:ro" fireflies-backend:dev \
        python scripts/verify_schema.py
"""

import sys
from pathlib import Path

# Python puts the *script's* directory on sys.path, not the working directory, so
# running this from scripts/ leaves the `app` package unimportable. Add the backend
# root explicitly rather than relying on the caller to export PYTHONPATH.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, inspect, select  # noqa: E402

from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    ActionItem,
    Chapter,
    Meeting,
    Participant,
    Speaker,
    Summary,
    TranscriptSegment,
)
from app.seed.loader import seed_database  # noqa: E402

failures: list[str] = []


def check(label: str, condition: bool, detail: str = "") -> None:
    print(f"  {'PASS' if condition else 'FAIL'}  {label}{f' — {detail}' if detail else ''}")
    if not condition:
        failures.append(label)


print("\n[1] create_all")
Base.metadata.create_all(bind=engine)
tables = sorted(inspect(engine).get_table_names())
print(f"  tables: {', '.join(tables)}")
expected = {
    "meetings", "participants", "meeting_participants", "speakers",
    "transcript_segments", "summaries", "chapters", "action_items",
    "tags", "meeting_tags",
}
check("all expected tables created", expected.issubset(set(tables)),
      f"missing {sorted(expected - set(tables))}" if not expected.issubset(set(tables)) else "")

print("\n[2] foreign keys enforced")
with engine.connect() as conn:
    fk = conn.exec_driver_sql("PRAGMA foreign_keys").scalar()
    journal = conn.exec_driver_sql("PRAGMA journal_mode").scalar()
check("PRAGMA foreign_keys is ON", fk == 1, f"got {fk}")
check("PRAGMA journal_mode is WAL", str(journal).lower() == "wal", f"got {journal}")

print("\n[3] seed load")
with SessionLocal() as db:
    loaded = seed_database(db)
    counts = {
        "meetings": db.scalar(select(func.count()).select_from(Meeting)),
        "participants": db.scalar(select(func.count()).select_from(Participant)),
        "speakers": db.scalar(select(func.count()).select_from(Speaker)),
        "segments": db.scalar(select(func.count()).select_from(TranscriptSegment)),
        "summaries": db.scalar(select(func.count()).select_from(Summary)),
        "chapters": db.scalar(select(func.count()).select_from(Chapter)),
        "action_items": db.scalar(select(func.count()).select_from(ActionItem)),
    }
print(f"  fixtures loaded: {loaded}")
print(f"  rows: {counts}")
check("at least one meeting seeded", counts["meetings"] >= 1)
check("segments seeded", counts["segments"] > 0)
check("summary seeded", counts["summaries"] > 0)

print("\n[4] idempotency")
with SessionLocal() as db:
    again = seed_database(db)
    after = db.scalar(select(func.count()).select_from(Meeting))
check("re-running the loader is a no-op", again == 0 and after == counts["meetings"],
      f"loaded={again}, meetings={after}")

print("\n[5] cascade delete")
with SessionLocal() as db:
    meeting = db.scalar(select(Meeting))
    meeting_id = meeting.id
    db.delete(meeting)
    db.commit()

    orphans = {
        "segments": db.scalar(
            select(func.count()).select_from(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting_id)
        ),
        "speakers": db.scalar(
            select(func.count()).select_from(Speaker).where(Speaker.meeting_id == meeting_id)
        ),
        "summary": db.scalar(
            select(func.count()).select_from(Summary).where(Summary.meeting_id == meeting_id)
        ),
        "chapters": db.scalar(
            select(func.count()).select_from(Chapter).where(Chapter.meeting_id == meeting_id)
        ),
        "action_items": db.scalar(
            select(func.count()).select_from(ActionItem)
            .where(ActionItem.meeting_id == meeting_id)
        ),
    }
    survivors = db.scalar(select(func.count()).select_from(Participant))
print(f"  orphaned rows after delete: {orphans}")
check("deleting a meeting removes all its children", not any(orphans.values()))
check("participants survive meeting deletion", survivors > 0, f"{survivors} remain")

print("\n" + ("FAILED: " + ", ".join(failures) if failures else "All schema checks passed."))
sys.exit(1 if failures else 0)
