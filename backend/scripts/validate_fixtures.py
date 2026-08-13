"""Validate every seed fixture independently of the agents that wrote them.

Checks each file against the loader's own invariants, then adds cross-fixture
checks no single fixture author could perform: participants are deduplicated on
email, so the same email appearing with two different names or colours would
produce one participant whose displayed identity depends on load order.

    docker run --rm -v "$PWD/backend/scripts:/srv/scripts:ro" \
        fireflies-backend:dev python scripts/validate_fixtures.py
"""

import json
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.seed.loader import DATA_DIR, FixtureError, validate_fixture  # noqa: E402

problems: list[str] = []
by_email: dict[str, set[tuple[str, str]]] = defaultdict(set)
by_name: dict[str, set[str]] = defaultdict(set)
titles: list[str] = []

paths = sorted(DATA_DIR.glob("*.json"))
print(f"Validating {len(paths)} fixtures\n")

for path in paths:
    try:
        fixture = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        problems.append(f"{path.name}: invalid JSON — {exc}")
        continue

    try:
        validate_fixture(fixture, path.name)
    except FixtureError as exc:
        problems.append(str(exc))
        status = "INVALID"
    except KeyError as exc:
        problems.append(f"{path.name}: missing required key {exc}")
        status = "INVALID"
    else:
        status = "ok"

    segments = fixture.get("segments", [])
    last_end = max((s["end_ms"] for s in segments), default=0)
    duration = fixture.get("duration_ms", 0)
    speakers = len({s["speaker"] for s in segments})
    tail = duration - last_end

    print(
        f"  {status:8} {path.name:44} "
        f"segments={len(segments):3}  speakers={speakers}  "
        f"duration={duration:7}  tail={tail:5}ms  "
        f"chapters={len(fixture.get('chapters', []))}  "
        f"actions={len(fixture.get('action_items', []))}"
    )

    titles.append(fixture.get("title", path.name))
    for participant in fixture.get("participants", []):
        if email := participant.get("email"):
            by_email[email].add((participant["name"], participant.get("color", "")))
            by_name[participant["name"]].add(email)

    # A tail far longer than a couple of seconds means the seek bar ends on dead air.
    if status == "ok" and tail > 5000:
        problems.append(f"{path.name}: {tail}ms of dead air after the last segment")

print("\nCross-fixture consistency")
for email, identities in sorted(by_email.items()):
    if len(identities) > 1:
        problems.append(f"email {email} used with conflicting identities: {sorted(identities)}")
        print(f"  CONFLICT {email}: {sorted(identities)}")
for name, emails in sorted(by_name.items()):
    if len(emails) > 1:
        problems.append(f"name '{name}' used with multiple emails: {sorted(emails)}")
        print(f"  CONFLICT {name}: {sorted(emails)}")

print(f"  {len(by_email)} distinct participants across {len(paths)} meetings")
if len(set(titles)) != len(titles):
    problems.append("duplicate meeting titles across fixtures")

print()
if problems:
    print(f"FAILED — {len(problems)} problem(s):")
    for problem in problems:
        print(f"  - {problem}")
    sys.exit(1)
print("All fixtures valid.")
