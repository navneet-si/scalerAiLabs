# Implementation Plan — Fireflies.ai Clone

Phased build plan. **Phases are implemented one at a time, in order.** A phase is
only marked ✅ Done when its exit criteria are actually verified (command run,
output seen) — not when the code is merely written.

- Status key: `⬜ Not started` · `🟡 In progress` · `✅ Done` · `🔴 Blocked`
- Running record of every action taken lives in [WORKLOG.md](./WORKLOG.md).

| Phase | Name | Status |
|---|---|---|
| 0 | Environment & scaffold | 🟡 In progress |
| 1 | Database schema & models | 🟡 In progress |
| 2 | Seed data | 🟡 In progress |
| 3 | Backend API — read paths | ⬜ |
| 4 | Backend API — CRUD & ingestion | ⬜ |
| 5 | Frontend scaffold & design system | ⬜ |
| 6 | Meetings library view | ⬜ |
| 7 | Meeting notebook — transcript & player sync | ⬜ |
| 8 | Summary, chapters & action items | ⬜ |
| 9 | Fireflies polish & placeholders | ⬜ |
| 10 | Documentation (README) | ⬜ |
| 11 | Containerisation & AWS deployment | ⬜ |
| 12 | Bonus features (time permitting) | ⬜ |

---

## Phase 0 — Environment & scaffold 🟡

Get a reproducible Python/Node toolchain and the repo skeleton the deliverable
requires (`frontend/` + `backend/`).

- [x] Repo skeleton `backend/app/{core,models,seed}`
- [x] `requirements.txt`
- [ ] **Working** Python environment with deps installed (see Blocker B-1)
- [ ] `.gitignore` (exclude `.venv`, `node_modules`, `data/*.db`, `.env`)
- [ ] `git init` + initial commit
- [ ] Frontend scaffold (`create-next-app`, TypeScript + Tailwind)

**Exit criteria:** `python -c "import fastapi, sqlalchemy, pydantic"` succeeds and
`npm run dev` serves the Next.js starter.

**Blocker B-1:** local interpreter is Python 3.14.6; the pinned
`pydantic==2.10.4` has no cp314 wheel and the source build failed. Resolution
options: (a) relax pins to versions publishing cp314 wheels, (b) run the backend
in Docker on `python:3.12-slim` locally as well as in production. Option (b) is
preferred because it makes local and deployed environments identical.

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
- [ ] Verify `Base.metadata.create_all()` runs and emits the expected DDL
- [ ] Confirm `ON DELETE CASCADE` behaviour with `PRAGMA foreign_keys=ON`

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
- [x] Fixture 1 — Q3 Product Roadmap Review (45 segments)
- [ ] Fixtures 2–6 (varied: sales call, 1:1, standup, customer interview, design review)
- [ ] Idempotent loader: seeds only when the `meetings` table is empty
- [ ] Dates stored as `days_ago` offsets so the library always looks current

**Exit criteria:** fresh DB → 6 meetings with full transcripts, summaries,
chapters and action items; re-running the loader does not duplicate rows.

## Phase 3 — Backend API, read paths ⬜

- [ ] Pydantic v2 schemas (separate from ORM models)
- [ ] `GET /api/meetings` — search, filter by participant/tag/date, sort by recency, paginate
- [ ] `GET /api/meetings/{id}` — full notebook payload
- [ ] `GET /api/meetings/{id}/transcript`
- [ ] `GET /api/search` — global cross-meeting transcript search (bonus, cheap here)
- [ ] `GET /api/participants`, `GET /api/me`
- [ ] Service layer between routers and models

**Exit criteria:** every endpoint returns correct data via `/docs`.

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
