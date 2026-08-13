# Implementation Plan — Fireflies.ai Clone

Phased build plan. **Phases are implemented one at a time, in order.** A phase is
only marked ✅ Done when its exit criteria are actually verified (command run,
output seen) — not when the code is merely written.

- Status key: `⬜ Not started` · `🟡 In progress` · `✅ Done` · `🔴 Blocked`
- Running record of every action taken lives in [WORKLOG.md](./WORKLOG.md).

| Phase | Name | Status |
|---|---|---|
| 0 | Environment & scaffold | 🟢 Done (pending `npm run dev` check) |
| 1 | Database schema & models | 🟢 Done — all 9 checks verified by execution |
| 2 | Seed data | 🟢 5 of 6 fixtures done & validated; 1 outstanding |
| 3 | Backend API — read paths | 🟢 Done & live-tested (global search still to add) |
| 4 | Backend API — CRUD & ingestion | ⬜ **← resume here** |
| 5 | Frontend scaffold & design system | ⬜ |
| 6 | Meetings library view | ⬜ |
| 7 | Meeting notebook — transcript & player sync | ⬜ |
| 8 | Summary, chapters & action items | ⬜ |
| 9 | Fireflies polish & placeholders | ⬜ |
| 10 | Documentation (README) | 🟡 README written; needs updating as features land |
| 11 | Containerisation & AWS deployment | ⬜ (backend Dockerfile done) |
| 12 | Bonus features (time permitting) | ⬜ |

---

## Current state — read this first when resuming

**Working and verified by running it:**
- SQLite schema: 10 tables, FKs enforced, WAL, cascade deletes confirmed.
- Seed loader: idempotent, validates fixture timelines, 5 meetings / 174 segments load clean.
- Read API: list (search by title *or participant name*, filter by participant/tag/date,
  sort, paginate), detail, transcript, participants, tags, current user, health.
  All exercised against a live container; counts cross-checked against the detail endpoint.
- Backend runs in Docker on `python:3.12-slim`.

**Verify the whole backend in one command:**
```bash
docker build -t fireflies-backend:dev ./backend
docker run --rm -e DATABASE_URL=sqlite:////tmp/v.db \
  -v "$PWD/backend/scripts:/srv/scripts:ro" fireflies-backend:dev python scripts/verify_schema.py
docker run --rm -v "$PWD/backend/scripts:/srv/scripts:ro" \
  -v "$PWD/backend/app/seed/data:/srv/app/seed/data:ro" \
  fireflies-backend:dev python scripts/validate_fixtures.py
```

**Not started at all:** the entire frontend beyond the `create-next-app` scaffold — which is
the largest remaining chunk of work, and includes the highest-risk feature (Phase 7).

**Known constraint:** the account hit an API session limit (resets 05:30 Asia/Kolkata) which
killed one agent mid-task. Plan agent work as fewer, larger tasks rather than many small ones.

### Immediate next steps, in order
1. Write the 6th fixture (`06-notebook-redesign-review.json`) — brief is in WORKLOG entry 16;
   validate with `validate_fixtures.py`.
2. Phase 4: meeting CRUD + `.txt`/`.vtt`/`.json` transcript ingestion + mock summary generator.
3. Phase 5–6: frontend shell and library view (parallelisable with Phase 4 — the API
   contract in `backend/app/schemas/` is frozen).
4. Phase 7: the player/transcript sync. **Do this personally, not via an agent** — it is one
   tightly-coupled feature and the most heavily graded.

---

## Phase 0 — Environment & scaffold 🟡

Get a reproducible Python/Node toolchain and the repo skeleton the deliverable
requires (`frontend/` + `backend/`).

- [x] Repo skeleton `backend/app/{core,models,seed,schemas,scripts}`
- [x] `requirements.txt`
- [x] **Working** Python environment — Docker `python:3.12-slim` (B-1 resolved)
- [x] `.gitignore` (excludes `.venv`, `node_modules`, `*.db`, `.env`, `notes/`)
- [x] `git init` + initial commit (`ab349bb`)
- [x] Frontend scaffold (`create-next-app`, TypeScript + Tailwind, App Router, `src/`)
- [ ] `npm run dev` smoke check

**Exit criteria:** image builds and imports succeed (✅ — build exited 0 on
`python:3.12-slim`, cp312 wheels resolved); `npm run dev` serves the starter.

**Blocker B-1 — RESOLVED.** Local interpreter is Python 3.14.6 and pinned
`pydantic==2.10.4` has no cp314 wheel, so the source build failed. Resolved by
running the backend in Docker on `python:3.12-slim` locally *and* in production,
which also makes the two environments identical.

**Dependency freeze.** `requirements.txt` was reviewed against every remaining
phase (uploads → `python-multipart`, VTT/TXT parsing → stdlib, export → stdlib,
email validation → `email-validator`). It is considered complete; further
additions mid-build force an image rebuild, so batch any into one.

## Phase 1 — Database schema & models 🟡

SQLite schema is an explicit evaluation criterion, so it is designed
deliberately rather than derived from the UI.

- [x] `Participant` + `meeting_participants` association (M2M)
- [x] `Meeting` (source/status enums, `duration_ms`, organizer FK)
- [x] `Speaker` (per-meeting diarization label, optional link to a Participant)
- [x] `TranscriptSegment` (`start_ms`/`end_ms`/`seq`, composite indexes)
- [x] `Summary` (overview + JSON keywords/bullet notes) and `Chapter` (seekable outline)
- [x] `ActionItem` (assignee, done flag, due date, optional source segment)
- [x] `Tag` + `meeting_tags` (M2M, powers bonus tag filtering)
- [x] `backend/scripts/verify_schema.py` — checks DDL, PRAGMAs, seed load,
      loader idempotency, and cascade deletes in one pass
- [x] **Run and green:** 10 tables created, `foreign_keys=ON`, `journal_mode=wal`,
      seed loads (41 segments / 4 speakers / 4 chapters / 4 action items), re-running the
      loader is a no-op, deleting a meeting orphans nothing, participants survive.
- [x] M2M join rows confirmed persisting (4 `meeting_participants` rows, organizer + tags correct)

**Design decisions to defend in the interview:**
1. **All time is `*_ms` integers.** Transcript segments, chapters and meeting
   duration share one unit, so click-to-seek, chapter jumps and progress-bar
   maths are the same lookup instead of three ad-hoc conversions.
2. **`Speaker` is separate from `Participant`.** A transcript can carry
   unresolved speakers (`"Speaker 1"`) that are later mapped to a real person —
   which is exactly what an uploaded `.vtt` gives you.
3. **JSON columns only for opaque display lists** (keywords, bullet notes).
   Anything that is queried, filtered or seeked to (chapters, action items) is a
   real table with real foreign keys.

**Exit criteria:** schema creates cleanly; deleting a meeting removes its
segments, summary, chapters and action items.

## Phase 2 — Seed data 🟡

Task requires the app to be "immediately usable" on first run.

- [x] Canonical fixture JSON shape defined (doubles as the upload format)
- [x] Fixture 1 — Q3 Product Roadmap Review (41 segments, 468s)
- [x] `data/FORMAT.md` — schema, invariants and content guidance; also the brief
      handed to the fan-out agents
- [x] Idempotent loader (`seed/loader.py`): no-op when `meetings` is non-empty
- [x] `validate_fixture()` enforces the timeline invariants at load time, so a bad
      fixture fails startup loudly instead of producing a broken seek bar
- [x] Dates stored as `days_ago` offsets so the library always looks current
- [x] Fixtures 2–5 — written by parallel agents and **independently validated**:
      sales discovery (40 seg), standup (28 seg), 1:1 (31 seg), customer interview (34 seg)
- [x] `scripts/validate_fixtures.py` — re-runs loader invariants on every fixture plus
      cross-fixture checks (duplicate emails with conflicting identities, one name mapped to
      two emails, duplicate titles, excessive dead air). Currently green on all 5.
- [ ] Fixture 6 — `06-notebook-redesign-review.json` (agent hit the API session limit)

**Totals so far:** 5 meetings · 174 segments · 10 participants · 22 chapters · 22 action items.

**Exit criteria:** fresh DB → 6 meetings with full transcripts, summaries,
chapters and action items; re-running the loader does not duplicate rows.

## Phase 3 — Backend API, read paths ⬜

- [x] Pydantic v2 schemas (separate from ORM models) — `schemas/{common,participant,
      transcript,summary,action_item,meeting}.py`. **This is Gate B: the frozen API
      contract that lets frontend and backend proceed in parallel.**
- [x] `GET /api/meetings` — search, filter by participant/tag/date, sort, paginate ✅ live-tested
- [x] `GET /api/meetings/{id}` — full notebook payload (404s correctly)
- [x] `GET /api/meetings/{id}/transcript` ✅ 41 segments, 4 speakers, duration correct
- [x] `GET /api/participants`, `GET /api/me`, `GET /api/tags` ✅
- [x] Service layer between routers and models (`services/meeting_service.py`)
- [ ] `GET /api/search` — global cross-meeting transcript search (bonus)
- [x] Computed `action_item_count` / `open_action_item_count` / `has_summary` verified
      across 4 meetings — list-endpoint counts cross-checked against the detail endpoint
      and match exactly (4/3, 5/3, 4/3). `sort=oldest` and `?tag=Engineering` also verified.

**Exit criteria:** every endpoint returns correct data. ✅ verified against a live
container on port 8199; search by participant name works, empty search returns 0,
unknown id returns 404, no errors or warnings in the server log.

## Phase 4 — Backend API, CRUD & ingestion ⬜

- [ ] `POST/PATCH/DELETE /api/meetings`
- [ ] Action item create/update/toggle/delete
- [ ] `POST /api/meetings/upload` accepting `.txt`, `.vtt`, `.json`
- [ ] Parsers for each format → normalised segments + speakers
- [ ] Mock summary generator (deterministic, from transcript text)
- [ ] Consistent error handling + validation responses

**Exit criteria:** a `.vtt` upload produces a fully populated, browsable meeting.

## Phase 5 — Frontend scaffold & design system ⬜

- [ ] Next.js App Router + TypeScript + Tailwind
- [ ] TanStack Query provider, typed API client
- [ ] Fireflies-like tokens: colour palette, type scale, spacing, radii
- [ ] App shell: left icon rail + sidebar nav, top bar with profile menu
- [ ] Toast system (`sonner`)

**Exit criteria:** shell renders and matches reference screenshots.

## Phase 6 — Meetings library view ⬜

- [ ] Meeting list rows: title, date, duration, participant avatars
- [ ] Search box (debounced, server-backed)
- [ ] Filters: participant, date range, tag
- [ ] Sort by recency
- [ ] Empty / loading / error states
- [ ] "Upload transcript" and "New meeting" entry points

**Exit criteria:** all list interactions hit the API and feel instant.

## Phase 7 — Meeting notebook: transcript & player sync ⬜

The highest-risk feature; built before the cosmetic work.

- [ ] Two-panel notebook layout (notes left, transcript right) + collapse/expand
- [ ] `useMeetingPlayer` hook — virtual clock, play/pause, seek, rate
- [ ] Seek bar with chapter markers and buffered-style track
- [ ] Active-segment highlight via binary search over `start_ms`
- [ ] Auto-scroll to active line (disabled while the user scrolls manually)
- [ ] Click a transcript line → seek player
- [ ] In-transcript search with highlighted matches + next/prev navigation
- [ ] Swap in a real `<audio>` element when `audio_url` is present

**Exit criteria:** playing scrolls the transcript; clicking any line seeks; search
highlights every match without breaking the active-line highlight.

## Phase 8 — Summary, chapters & action items ⬜

- [ ] Notes panel: Keywords, Overview, Bullet-Point Notes, Time-stamped Outline, Action Items
- [ ] Chapter click → seek
- [ ] Action items: add, edit, complete, assign, delete (optimistic updates)
- [ ] Edit meeting metadata modal (title, participants, tags)
- [ ] Delete meeting with confirmation

**Exit criteria:** every mutation persists across a hard refresh.

## Phase 9 — Fireflies polish & placeholders ⬜

- [ ] Toasts on every mutation
- [ ] Skeleton loaders, empty states, hover/focus states, keyboard shortcuts
- [ ] "Coming Soon" placeholders: live meeting bot, real transcription,
      integrations (Zoom/Meet/CRM), team & sharing, settings
- [ ] Profile menu with mocked logged-in user
- [ ] Responsive behaviour down to tablet width
- [ ] Dark mode

**Exit criteria:** side-by-side comparison with reference screenshots holds up.

## Phase 10 — Documentation ⬜

- [ ] README: setup (local + Docker), tech stack, architecture overview
- [ ] Schema documentation + ER diagram
- [ ] API reference table
- [ ] Assumptions & deliberate scope decisions
- [ ] Note on what is mocked and why

**Exit criteria:** a stranger can clone and run it from the README alone.

## Phase 11 — Containerisation & AWS deployment ⬜

Target: single EC2 instance, single origin, real disk for SQLite.

- [ ] `backend/Dockerfile` (`python:3.12-slim`), `frontend/Dockerfile`
- [ ] `docker-compose.yml` + nginx: `/api/*` → FastAPI, everything else → Next.js
- [ ] SQLite file bind-mounted to a host directory on the EBS root volume
- [ ] New t3.micro in `ap-south-1` — **new key pair, tagged
      `project=fireflies-assignment`, `propel-demo` untouched**
- [ ] Elastic IP + security group (22 restricted, 80 open)
- [ ] CloudFront in front of the instance's public DNS for free HTTPS
      (`CachingDisabled` policy, all HTTP methods enabled)
- [ ] Smoke test the hosted URL end to end

**Exit criteria:** public HTTPS URL where meetings can be created and survive an
instance reboot.

**Cost note:** ~$8/month for t3.micro; instance to be terminated after evaluation.

## Phase 12 — Bonus (only after 0–11 are green) ⬜

- [ ] Export transcript/summary as Markdown or TXT
- [ ] Comments / highlights on transcript segments
- [ ] "Ask a question about this meeting" chat (mock or LLM-backed)
- [ ] Soundbites

---

## Open questions for the user

1. Repo destination — which GitHub account/org should the public repo live under?
2. Default logged-in user — currently seeded as "Alex Rivera"; swap to your name?
3. Real LLM summaries (needs an API key) or deterministic mock generator only?
