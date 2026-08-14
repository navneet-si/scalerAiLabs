# Work Log

Chronological record of every action taken on this project: what was done, what
was decided and why, and what failed. Newest entries at the bottom.

Phase definitions live in [PLAN.md](./PLAN.md).

---

## 2026-08-13

### 1. Requirements analysis
- Read `task.md`. Deliverable is a Fireflies.ai clone: Next.js (TS) frontend,
  Python (FastAPI/Django) backend, SQLite, seeded data, public repo, hosted demo.
- Noted the explicitly evaluated axes: functionality, UI/UX fidelity, **database
  design**, API design, code quality, code modularity, code understanding.

### 2. UI research
Sources consulted:
- <https://guide.fireflies.ai/articles/6653885315-learn-about-the-fireflies-notepad>
- <https://guide.fireflies.ai/articles/9547055509-Fireflies-AI-Meeting-Summaries:-View,-Customise,-Expand,-Regenerate>

Findings that drive the UI build:
- The notepad is a **two-panel workspace**: AI summary/notes on the left, full
  transcript on the right, either side expandable to full screen.
- A **collapsible left icon rail**: Smart Search, Index, Soundbites, Comments,
  Bookmarks.
- Top bar carries AI Skills, Share, Export and an overflow (⋯) menu.
- The default summary template has five sections: **Keywords, Overview,
  Bullet-Point Notes, Time-stamped Outline (chapters), Action Items.** These are
  mirrored exactly in our schema and UI.
- Transcript panel has find/replace and an edit mode with autosave.

### 3. Hosting investigation
- **Render free tier rejected:** ephemeral filesystem, no persistent disk on free
  services, so a SQLite file is lost on every restart/redeploy.
  (<https://render.com/docs/free>, <https://render.com/docs/disks>)
- Turso/libSQL noted but rejected — SQLite-compatible, yet a visible deviation
  from the task's explicit "Database: SQLite".
- Initial recommendation was Railway Hobby + volume (~$5/mo).
- **Superseded** when the user offered AWS access.

### 4. AWS access verified
```
aws sts get-caller-identity
```
- Account `736681843154`, IAM user `nav`, **AdministratorAccess**, region `ap-south-1`.
- Existing infrastructure: one running EC2 `propel-demo` (t3.small, 13.206.138.55),
  key pair `propel-demo`. No Route 53 hosted zones. Amplify/Lightsail/ECS empty.
- App Runner returns `SubscriptionRequiredException` in this region — irrelevant
  anyway, since it has no persistent disk and would break SQLite. Same
  disqualifier applies to ECS/Fargate and Lightsail containers.
- ⚠️ This is an Optmyzr company account with existing infrastructure. Agreed
  approach: **create new, isolated, tagged resources only; never touch
  `propel-demo`.**

**Decision — deployment architecture (supersedes Railway):**
single EC2 + Docker Compose + nginx (`/api/*` → FastAPI, rest → Next.js) →
single origin, so **no CORS at all**. SQLite bind-mounted onto the EBS root
volume for real persistence. Elastic IP (CloudFront requires a DNS origin, not an
IP) → CloudFront for free HTTPS on `*.cloudfront.net`, configured with
`CachingDisabled` and all HTTP methods enabled so the API isn't cached.

### 5. Backend scaffold written
Created:
```
backend/requirements.txt
backend/app/core/config.py       pydantic-settings; SQLite path auto-created
backend/app/core/database.py     engine, session, Base, PRAGMA hooks
backend/app/models/mixins.py     TimestampMixin
backend/app/models/participant.py Participant + meeting_participants (M2M)
backend/app/models/tag.py         Tag + meeting_tags (M2M)
backend/app/models/meeting.py     Meeting + source/status enums
backend/app/models/transcript.py  Speaker, TranscriptSegment
backend/app/models/summary.py     Summary, Chapter
backend/app/models/action_item.py ActionItem
backend/app/models/__init__.py
```
Notes:
- `PRAGMA foreign_keys=ON` is set on every connect — SQLite ignores foreign keys
  by default, which would silently defeat the whole cascade design.
- `PRAGMA journal_mode=WAL` for concurrent reads during playback.
- Time is stored as integer milliseconds everywhere.

### 6. First seed fixture
- `backend/app/seed/data/01-q3-product-roadmap-review.json` — 41 dialogue
  segments, 4 participants, summary (overview + 6 keywords + 3 grouped bullet
  sections), 4 chapters, 4 action items.
- **Bug found and fixed during authoring:** `duration_ms` was 2,436,000 (40 min)
  while the transcript actually ended at 466,000 ms, and chapter boundaries used
  the fictional timeline. The seek bar would have had ~87% dead space with no
  segments. Corrected `duration_ms` to 468,000 and rewrote all four chapter
  ranges to match real segment times. **Rule for remaining fixtures: chapters and
  duration must be derived from actual segment timestamps.**
- Fixture dates use `days_ago` offsets rather than absolute dates so the meetings
  library always looks current whenever the repo is cloned.

### 7. ❌ Dependency install failed (Blocker B-1)
```
python3 -m venv .venv && .venv/bin/pip -q install -r requirements.txt 2>&1 | tail -3
```
- The command reported **exit code 0 and appeared to succeed**, but the `| tail -3`
  at the end of the pipeline masked pip's real exit status.
- Verification (`pip list`, and listing `site-packages`) shows the venv contains
  **only pip** — FastAPI, SQLAlchemy and Pydantic are absent.
- Cause: local interpreter is **Python 3.14.6**; pinned `pydantic==2.10.4` has no
  cp314 wheel, so pip attempted a `pydantic-core` source build (Rust) and failed.
- I had reported this install as successful in an earlier message. **That was
  wrong and is corrected here.**
- Lesson recorded: never terminate a verification pipeline with `tail`/`head` —
  it discards the exit status of the command being checked.

**Resolution options (Phase 0):**
- (a) Relax version pins to releases that publish cp314 wheels.
- (b) Run the backend in Docker on `python:3.12-slim` locally *and* in
  production, making the two environments identical. **Preferred.**

### 8. Tracking files created
- `PLAN.md` — 13 phases (0–12) with tasks, exit criteria and design rationale.
- `WORKLOG.md` — this file.

**Next action:** resolve Blocker B-1, then finish Phase 0 (`.gitignore`, `git init`,
Next.js scaffold) before starting Phase 1 verification.

### 9. Blocker B-1 resolved — Docker
- Verified available toolchain: Docker 29.6.2 with a reachable daemon, Docker Compose 5.3.1,
  Node v25.2.1, npm 11.6.2, git 2.55.0.
- **Decision:** run the backend in Docker on `python:3.12-slim` locally *and* in production
  rather than relaxing version pins. Local and deployed environments become identical, and
  the host's Python 3.14 stops mattering.
- Created `backend/Dockerfile`, `backend/.dockerignore`, `backend/app/main.py`
  (lifespan `create_all` + `/api/health` + CORS for local dev only), and root `.gitignore`.
- Deleted the broken `backend/.venv`.
- ⏸️ The image build was interrupted before running — not yet verified.
- Note: Node v25 is newer than Next.js's usual supported range (20/22/24). If `create-next-app`
  or the build misbehaves, containerise the frontend too rather than debugging the host.

### 10. Model strategy research (user request)
- Question asked: best model for code and docs, and whether multiple models can run in parallel.
- Findings written to `notes/model-strategy.md`; `notes/` added to `.gitignore` because the
  assignment repository must be public and this is internal working material.
- Headline conclusions:
  - **Coding:** Claude leads on agentic, multi-file, real-repo work (SWE-bench-style);
    GPT leads some terminal benchmarks; Gemini leads algorithmic puzzles. Benchmarks come
    from aggregator sites of mixed rigor — treated as a rough ranking only.
  - **Docs:** there is no separate "docs model". Whichever model has the code in context
    writes the best README; splitting docs to another provider is counterproductive.
  - **Parallelism:** yes, three levels — per-subagent `model` override (concurrent, available
    in this session), `Workflow` fan-out, and git worktrees for conflict-free parallel edits.
    Practical ceiling is 4–8 concurrent agents, bounded by human review capacity.
  - **Routing for this project:** Opus 5 for schema/sync-architecture/deploy-debugging/docs,
    Sonnet 5 for bulk implementation (intro pricing ends 2026-08-31), Haiku 4.5 for mechanical
    work. Parallelise frontend/backend after the API contract is fixed; do **not** parallelise
    the transcript↔player sync feature.

### 11. Model routing agreed
- User selected the full delegation plan. Routing: Opus (me) keeps schema, the
  transcript↔player sync, deploy and the README; Sonnet takes seed fixtures and bulk
  implementation; Haiku takes mechanical sweeps.
- Two hard gates, nothing parallelises across them:
  - **Gate A** — schema verified → seed fixtures can fan out.
  - **Gate B** — API contract frozen → frontend and backend can split.
- Peak concurrency 5 (the fixture fan-out). I review every agent diff before it lands.

### 12. Phase 0 closed
- `docker build` on `python:3.12-slim` **exited 0** — cp312 wheels resolved for the whole
  dependency set, confirming the B-1 resolution works.
- `git init` + first commit `ab349bb`. Verified `git ls-files` excludes `notes/` and `.venv`.
- `create-next-app` completed (exit 0): TypeScript, Tailwind, ESLint, App Router, `src/`.
  Node v25 handled it fine, so the earlier concern did not materialise.
- Outstanding: `npm run dev` smoke check.

### 13. Phases 1–3 code written
- `seed/loader.py` — idempotent loader; participants deduplicated on email across fixtures;
  `days_ago` → absolute dates at load time; `validate_fixture()` enforces the timeline
  invariants so a malformed fixture fails startup rather than silently producing a broken
  seek bar. Wired into the FastAPI lifespan behind the `seed_on_startup` setting.
- `seed/data/FORMAT.md` — documents the fixture/upload format and its invariants. Doubles
  as the brief for the fan-out agents and as source material for the README.
- `schemas/` — Pydantic v2 response/request models, deliberately separate from the ORM
  models. `MeetingListItem` excludes transcript segments (a 10-row library would otherwise
  ship thousands of unrendered lines); `MeetingDetail` excludes them too so the summary
  panel can paint before the transcript arrives. **This is Gate B.**
- `scripts/verify_schema.py` — one pass over DDL, PRAGMAs, seed load, idempotency and
  cascade deletes. **Written but not yet run.**

### 14. Process correction — avoid self-inflicted reruns
- I added `email-validator` to `requirements.txt` *after* the image had already been built,
  forcing a rebuild. The user flagged this: keeping the plan and log current as work happens
  is what prevents duplicate work and re-runs, and preserves context across sessions.
- **Adopted rules:**
  1. Update `PLAN.md` / `WORKLOG.md` *as* steps complete, not in retrospective batches.
  2. Before any expensive step (image build, install, deploy), check the record for
     pending changes that should be batched into it.
  3. Record what has been *verified by running it* versus merely written — this log now
     distinguishes the two explicitly.
- Applied immediately: `requirements.txt` was reviewed against every remaining phase and
  frozen (see PLAN.md → Phase 0 → Dependency freeze), so exactly **one** rebuild remains.

### 15. Phase 1 verified — Gate A opened
- Rebuilt with `email-validator` (exit 0) and ran `verify_schema.py`. **All 9 checks pass.**
- Two issues found and fixed while verifying, rather than tolerated:
  - `verify_schema.py` failed with `ModuleNotFoundError: No module named 'app'`. Python puts
    the *script's* directory on `sys.path`, not the working directory. I first patched this
    with a `-e PYTHONPATH=/srv` flag, which fixes one invocation and leaves the script broken
    for anyone running it as documented. Replaced with a `sys.path.insert()` bootstrap in the
    file itself, then re-ran using the documented command to prove the fix.
  - `SAWarning: Object of type <Meeting> not in session` from `loader.py` — caused by
    assigning `meeting.participants` before `db.add(meeting)`. Confirmed the join rows *did*
    persist (4 `meeting_participants` rows, correct organizer and tags), so it was benign in
    effect, but reordered the `db.add()` to remove it.
- **Correction:** fixture 1 has **41** segments, not the 45 I stated earlier. Records fixed.

### 16. Fixture fan-out launched (5 parallel Sonnet agents)
- One agent per fixture: sales discovery, engineering standup, 1:1, customer interview,
  design review. Each was given `FORMAT.md`, fixture 01 as reference, a **canonical
  participant roster** (fixed names/emails/colors so dedup-on-email works and avatar colours
  stay consistent across meetings), the hard invariants, and a per-meeting brief.
- Agents were told explicitly not to run docker or any DB command and not to touch other
  files — validation happens centrally once they land, so five concurrent containers don't
  fight over the image and database.

### 17. Read-path API built and live-tested (my own work, parallel to the agents)
- `services/meeting_service.py` — filtering, sorting, pagination; **one aggregate query per
  page** for action-item counts instead of per-row lookups (avoids N+1); `selectinload` for
  participants/tags/speakers/chapters/summary/action-items.
- `routers/meetings.py`, `routers/participants.py`; both wired into `main.py`.
- Bug caught immediately after writing: I used
  `func.sum(func.cast(~ActionItem.is_done, type_=func.count().type))`, which is not valid
  SQLAlchemy. Replaced with `func.sum(case((ActionItem.is_done.is_(False), 1), else_=0))`.
- **Verified against a live container** (port 8199): health OK; list returns participants
  with initials and colours; `?search=priya` matches by *participant name* (total 1);
  unknown search returns 0; `/api/me` returns the flagged current user; transcript returns
  duration 468000 with 4 speakers and 41 segments; unknown meeting id returns 404; server
  log clean of errors and warnings.
- Still to re-check: the computed `action_item_count` / `has_summary` fields, once more than
  one fixture exists — that aggregate is the least-exercised code path.

### 18. Independent fixture validation
- Wrote `scripts/validate_fixtures.py` rather than trusting the agents' self-reports. It
  re-runs the loader's own `validate_fixture()` on every file, and adds **cross-fixture
  checks no single agent could perform**:
  - the same email appearing with two different names or colours (participants dedupe on
    email, so a conflict would give one participant an identity that depends on load order),
  - the same person name mapped to two different emails,
  - duplicate meeting titles,
  - more than 5s of dead air between the last segment and `duration_ms`.
- Result on the fixtures delivered so far: **all valid, no conflicts.** The canonical-roster
  instruction in the agent briefs did its job — 7 distinct participants, no identity drift.

### 19. Aggregate query verified against real data
- The `case()` aggregate flagged in entry 17 now checked across 4 meetings: list-endpoint
  `action_item_count` / `open_action_item_count` cross-checked against the detail endpoint's
  raw arrays — exact match on every meeting (4/3, 5/3, 4/3). `has_summary` true throughout.
- Also verified `sort=oldest` returns ascending dates and `?tag=Engineering` filters to one
  meeting. Server log clean.

### 20. Fan-out outcome — 5 of 6 fixtures delivered
| Fixture | Agent outcome | Validated |
|---|---|---|
| `02-enterprise-sales-discovery-call.json` | agent **stopped by user** — but the file had already been written | ✅ valid |
| `03-engineering-standup.json` | completed | ✅ valid |
| `04-alex-sarah-1-1.json` | completed | ✅ valid |
| `05-customer-onboarding-interview.json` | completed | ✅ valid |
| `06-notebook-redesign-review.json` | **FAILED — API session limit reached** (resets 05:30 Asia/Kolkata) | ✗ not written |

- Final validation across all 5 delivered fixtures: **all valid, zero cross-fixture
  conflicts**, 10 distinct participants, 174 transcript segments, 22 chapters, 22 action
  items. Every `duration_ms` derives from real segment ends (tails 1500–2500ms).
- The canonical-roster instruction worked: no email/name/colour drift between agents, which
  was the main risk of parallelising this.
- **New constraint discovered: the account has an API session limit that resets at 05:30
  Asia/Kolkata.** This bounds how much parallel agent work is available per session and must
  be planned around — prefer fewer, larger agent tasks over many small ones from here.

### 21. Work paused for documentation
- User asked to stop and bring documentation current. No further build work performed after
  this point; `README.md` written covering setup, architecture, schema and API.

### 22. Decision: mock summary generator, not an LLM
- User: "lets go with mock now and if possible will change it later."
- Consequence for the design: `summarizer.generate()` is the **single** entry point and the
  single swap point. Nothing else in the codebase knows how a summary is produced; replacing
  the mock means reimplementing that one function to return the same `GeneratedSummary`.
- Chose an **extractive** mock over a templated one. A template ("This meeting covered
  several topics") is identical for every meeting and reads as obvious filler in a demo.
  Scoring real sentences costs the same and produces genuinely different output per meeting,
  and every keyword/bullet/chapter traces back to a line an evaluator can search for.

### 23. Phase 4 — CRUD, ingestion and the mock generator
**Blocker found before writing any code.** `validate_fixture` required every segment speaker
to be a listed participant. But design decision #2 — the one recorded for the interview — is
that a transcript can carry *unresolved* speaker labels. Those two cannot both hold: a `.vtt`
with `<v Speaker 1>` would either fail validation or force us to invent a Participant named
"Speaker 1", which pollutes `/api/participants` and breaks the library's participant filter.

Resolved by splitting the validator:
- `validate_timeline()` — ordering, non-overlap, duration ≥ last end, chapters in range.
  Applies to **any** transcript, seeded or uploaded.
- `validate_fixture()` — timeline **plus** identity resolution (speaker must be a known
  participant, organizer must match). Seed-only, because a fixture is authored and a stray
  name there is a typo worth failing on.

Also extracted `people_service.py` so the seed loader and the write API share **one**
participant/tag dedupe rule. Two copies would drift and the symptom would be duplicate people
silently breaking the participant filter.

Built:
- `transcript_parser.py` — `.vtt` / `.json` / `.txt` all collapse to one `ParsedTranscript`,
  so persistence, the summariser and the player are written once. Normalises overlapping cues
  (real VTT files overlap by milliseconds on speaker changes) and times un-timestamped pasted
  text at 2.75 words/sec, which is what makes a paste playable rather than a wall of text.
- `summarizer.py` — deterministic extractive generator; `generated_by="mock"` in the data.
- `ingest_service.py` — create / update / delete / upload; `_as_utc()` normalises a naive
  posted `meeting_date` so it date-filters consistently against tz-aware seeded rows.
- `action_item_service.py` + `routers/action_items.py`; write endpoints on `routers/meetings.py`.
- 422 handlers in `main.py` for `TranscriptParseError` and `FixtureError`.

**Two bugs caught by running it, not by reading it:**
1. `I'll` ranked as a top keyword. `_WORD` matched contractions and the stopword list can't
   enumerate them. Fixed with `_stem()`, which drops the contraction/possessive tail.
2. Every action item quoted the wrong sentence — "Alright, thanks for joining." instead of
   the commitment. Root cause was taking the *first* sentence of a line rather than the
   relevant one. Fixed with `_best_sentence()` (highest keyword density) for the overview,
   bullets and chapter gists, and `_cue_sentence()` (the sentence containing the cue) for
   action items. Both defects were invisible until real output was inspected.

**Verified:** `backend/scripts/verify_api.sh` — 29 assertions against a live container, all
passing, no tracebacks. Includes the two assertions that matter most and would otherwise fail
silently: an unresolved VTT speaker does **not** become a participant, and deleting a meeting
leaves zero orphaned rows while participants survive. `verify_schema.py` (9 checks) and
`validate_fixtures.py` re-run green after the loader refactor.

**Scope call:** `GET /api/search` (global search) is listed as *Bonus* in the spec and was
deliberately left unbuilt. The frontend is still at 0% and carries the two heaviest grading
criteria.

### Environment quirks worth remembering
- Shell is **zsh**: unquoted `$var` does **not** word-split. An early
  permission-probe loop passed `"aws iam list-... "` as a single argument and
  every call failed with "Invalid choice" until rewritten with `${=var}`.
- Bash tool working directory persists between calls, which caused a `find`
  exclusion path (`./backend/.venv/*`) to miss because the cwd was already
  `backend/`.

---

## 2026-08-14 — UX capture pass 2: the six unknowns, resolved

The first pass left six things unobserved and I had asked for help with them. Went back into
the live app and got all six from computed styles rather than from screenshots. Findings are
in `notes/ux-reference.md` (gitignored — the assignment repo is public and that account holds
real meeting data; only measurements and tokens were recorded, no titles, names or content).

**The one that mattered.** The active-line highlight is the core of Phase 7 and I had it
wrong in my head. Their DOM hands over the whole model: every sentence span carries
`cap-sent-76 cap-time-614.19--616.35 76 in-focus`.

- The active unit is the **sentence**, not the segment — neighbouring sentences in the *same*
  paragraph stay grey.
- The highlight is **text colour only**: `#C11574` (Untitled UI Pink 700), `transition: .25s`.
  No background tint, no left border, no weight change. The instinct to build a highlighted
  band with a purple rule would have been wrong.
- Through silence gaps the highlight **stays on the last spoken sentence**, so the lookup is
  "last sentence whose `start <= t`", not "sentence whose range contains `t`".
- **The panel never chases the playhead.** Tested it rather than assumed it: scrolled the
  transcript to `scrollTop: 2500`, clicked a `(21:30)` link in the notes, let it play 20s.
  The highlight tracked perfectly; `scrollTop` never moved, leaving the active line 7,000px
  off-screen. We should follow with `scrollIntoView({block:'center'})` and suspend on manual
  scroll — better than what they ship, and not a fidelity loss anyone would notice.
- Clicking a notes timestamp seeks **and** starts playback. At `t = 0` nothing is highlighted.
- The transcript is virtualized; ~10,000px of content, only the visible paragraphs in the DOM.

**Corrections to pass 1.** Library rows *are* cards (white, `1px #F2F4F7`, radius **12px**,
hover `#F9FAFB` + purple inherited text) — I had recorded them as borderless. Transcript type
is 16px/28px, not 15px. Speaker avatars are 20px rounded squares at 4px radius, not circles.
Buttons come in two heights, 32px and 40px, not one.

**Also captured:** modal shell (backdrop `rgba(12,12,13,.56)`, panel radius 16px, the app's
only two shadow tokens), the Meeting-info modal as our edit-metadata template, the `···` menu,
toasts (fixed `bottom: 50px`, `#0C0C0D`, radius 8px, ~6s lifetime), the no-results empty state
recipe, the upload page, and the settings card-per-row pattern.

**Deliberately not captured:** the delete-confirmation modal (would mean opening a destructive
dialog over someone's real meeting) and the zero-meetings empty state (would mean deleting
data). Both are safe to design from the shell and the empty-state recipe already recorded.

---

## 2026-08-14 — Closing the gaps the redesign left

An audit against `task.md`'s graded criteria found the frontend far more complete than
`EXECUTION.md`'s unticked boxes suggested — but with two classes of hole that a green build
cannot see, plus one outright correctness bug.

**A graded core feature was decorative.** `task.md` #2 requires "search within the transcript
with highlighted matches". `TranscriptPanel` shipped an `Input` placeholdered "Find or
Replace" with no `value`, no `onChange` and no filtering. It looked implemented. Built for
real: every occurrence of the query is a stop (a line containing the word twice is two
stops), with a match counter, prev/next buttons, Enter / Shift+Enter stepping and Escape to
clear.

Three things constrained the implementation:
- **The memo had to survive.** `TranscriptParagraph` is `memo()`'d specifically so playback
  ticks don't re-render every paragraph. Passing a precomputed per-paragraph match array
  would be a fresh reference each render and defeat it entirely. Search props are therefore
  primitives only — `searchQuery`, `activeMatchSentenceId`, `activeMatchOccurrence` — and the
  highlight is computed inside the memoized component. Same reasoning as the existing
  `activeSentenceId` prop, which only the owning paragraph receives.
- **No RegExp.** Highlighting uses `toLowerCase().indexOf()` and slicing, so a query of `(`
  or `*` is literal text rather than a thrown exception or a silent no-match.
- **Navigation goes through `onSeek`.** The panel already scrolls the active line to ~45%
  whenever the clock jumps more than 2s, so stepping reuses that tested path. It is backed up
  by an explicit scroll keyed on the current match, because two hits less than 2s apart don't
  trip the seek threshold and would otherwise not scroll at all.

**Working components were unreachable.** The redesign pass orphaned entry points rather than
breaking code. `CreateMeetingModal` was complete and spec-correct but `setSeedOpen` was never
called from anywhere — there was no way to create a meeting from a form. The library's
magnifier button had no `onClick`. `AskPanel` was rendered but `setAskOpen` was never called,
and `/askfred` had a question box that never called `api.askQuestion`. `TopBar` imported
`UploadModal` and never rendered it.

Fixed by moving the create modal onto the library page behind a visible "New meeting" button
rather than re-wiring a trigger to a globally-rendered modal — a global modal driven from
elsewhere is the same fragility that orphaned it the first time. `/askfred` now asks for real
and renders answers with citations that deep-link to `?t=<ms>`; `AskPanel` was deleted as
redundant with that and `RightChatBot`. Dead state and imports removed from `TopBar`.

**Lesson worth keeping:** `npm run build` was green through all of this. A build proves the
types line up; it says nothing about whether a button is connected to anything. After each
wiring fix the setter was grepped for an actual call site.

**The upload page was fabricating transcripts.** For any audio or video file it silently
synthesized a hardcoded WEBVTT placeholder and uploaded *that*, producing a meeting whose
content the user never supplied and which reads as genuine. Removed. The backend transcribes
nothing — it parses `.vtt`, `.json` and `.txt` — so the honest failure is now an inline
message saying exactly that. The dropzone was also advertising "MP3, M4A, WAV, MP4 or WEBM"
and `accept="audio/*,video/*"`; both now match what the backend actually ingests. The same
page surfaced 422s as a toast, contradicting the round-4 rule that a file-specific error
belongs next to the file — now inline, with the dialog kept open.

**Not-found was a bare red string.** `/notebook/<missing>` rendered
`text-[var(--color-red-600)]`, a token that does not exist in `globals.css`, so it wasn't even
red. Replaced with a proper empty state that distinguishes a 404 from a backend outage. A
non-numeric id (`/notebook/abc`) previously returned early from the effect and left the page
spinning on the loading state forever; it now resolves to not-found.

Also: README reconciled (it still claimed "the frontend is scaffolded but not yet built"),
`/api/query` documented, stale root `openapi.json` removed.

**Deliberately not touched** — these are decisions, not code: the logo colour (`#e72b6b` vs
E2's `#6938EF`), E1's 17 `font-semibold`/`font-bold` occurrences (the no-bold rule predates
the redesign pass, and a blanket sweep could visibly wreck it), the Groq key rotation, and
deployment.

**Verified by:** `npm run build` green (10 routes, TypeScript clean), all routes returning 200
against the live dev server, backend `/api/health` 200, and grep-confirmed call sites for
every setter. **Not verified in a browser** — per this project's rule, nothing here is ticked
in `EXECUTION.md`.
