# Read this before writing any code

This repo is a Fireflies.ai clone. The **backend is complete and must not be
modified** — `git status --porcelain backend/` must print nothing when you finish.
Your work is the Next.js frontend under `frontend/`.

## Required reading, in this order

1. **`handoff/PROMPT.md`** — the build spec: stack, architecture, phase order,
   the full API contract, the playback-sync specification, definition of done.
2. **`handoff/UX-REFERENCE.md`** — design tokens, measurements and behaviour,
   read off the real product's computed styles. It is a specification, not a mood
   board. Build to the numbers.
3. **`handoff/REVIEW-CHECKLIST.md`** — how this will be reviewed. Read it before
   you start, not after; it tells you exactly which mistakes are expected.

Also read `frontend/AGENTS.md`. **Next.js 16 differs from your training data** —
that file tells you where the current docs live in `node_modules`. Check them
before using an API you remember rather than one you've verified.

## Start the backend first

`handoff/PROMPT.md` requires you to verify every type against the live schema.
That is impossible unless the server is running:

```
docker build -t fireflies-backend:dev backend/
docker run -d --name ff-dev -p 8000:8000 fireflies-backend:dev
curl -s http://localhost:8000/api/health          # -> {"status":"ok"}
curl -s http://localhost:8000/openapi.json | head
```

The endpoint list in `handoff/PROMPT.md` was transcribed by hand from the Pydantic
schemas. **Where it disagrees with `/openapi.json`, the schema wins** — and note
the discrepancy in `handoff/frontend-questions.md`.

If you cannot start the backend, stop and say so rather than building against
remembered field names. A contract mismatch found after 3,000 lines of frontend
exist is the expensive kind of mistake.

## Two rules that override convenience

- **Do not copy code from any existing Fireflies clone repository.** This is an
  assessed assignment and copied code is disqualifying. Match the *design* from
  the UX reference; write the *code* yourself.
- **`npm run build` before declaring any phase done.** Turbopack dev does not
  typecheck. A green dev server proves nothing.
