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

### Environment quirks worth remembering
- Shell is **zsh**: unquoted `$var` does **not** word-split. An early
  permission-probe loop passed `"aws iam list-... "` as a single argument and
  every call failed with "Invalid choice" until rewritten with `${=var}`.
- Bash tool working directory persists between calls, which caused a `find`
  exclusion path (`./backend/.venv/*`) to miss because the cwd was already
  `backend/`.
