# Execution loop — pending functionality

Worked top to bottom. Each item has an acceptance check that is verifiable in a
real browser, not just by reading code. The loop for each item is:

```
implement -> npm run build -> verify in Chrome at localhost:3002 -> tick -> next
```

**Nothing is ticked until it has been seen working in the browser.** A green build
is not evidence; it only proves the types line up.

## Environment

```
docker run -d --name ff-dev -p 8000:8000 --env-file backend/.env fireflies-backend:dev
cd frontend && PORT=3002 NEXT_PUBLIC_API_BASE=http://localhost:8000/api npm run dev
```

Port 3000 is occupied by the unrelated `propel-api-1` container — leave it alone.

---

## A. Player bar  ✅

- [x] A1 Full-width purple progress bar directly above the bar, edge to edge, with
      a draggable circular knob at the playhead. Dragging seeks.
      **Check:** drag the knob; elapsed time jumps and the pink sentence moves.
- [x] A2 Skip back / forward move exactly 10,000ms.
      **Check:** from 00:00, forward once -> `00:10`.
- [x] A3 Speed control cycles 0.5 / 1 / 1.25 / 1.5 / 2 and actually changes rate.
      **Check:** set 2x, play 5s of wall clock, elapsed advances ~10s.

## B. Global queries — ask across meetings  🟡 (logic done, UI delegated)

- [x] B1 `POST /api/query` -> `{ answer, citations: [{meeting_id, title, start_ms, text}] }`.
      Stuffs relevant transcripts into context; no vector store (5-20 meetings).
      Falls back to a keyword search answer when no LLM key is configured.
      **Check:** `curl` returns a grounded answer with real meeting ids.
- [~] B2 Ask panel — behaviour verified, appearance handed to Antigravity (handoff/ROUND-3.md)
- [ ] B2 in the UI, reachable from the top bar.
      **Check:** ask a question about a seeded meeting, get an answer with
      clickable citations that navigate to that meeting and seek.

## C. Library completeness  ⬜

- [ ] C1 Filters popover wired to the existing server params: `participant_id`,
      `tag`, `date_from`/`date_to`, `sort`. Resets `offset` on change.
      **Check:** filter by a participant; row count drops and survives paging.
- [ ] C2 Search as a centred modal, `Ctrl+K` to open, `Esc` to close, debounced.
      **Check:** `Ctrl+K` opens it; typing filters; `Esc` closes.
- [ ] C3 Both empty states — no results, and no meetings at all.
      **Check:** search gibberish; then point at an empty DB on port 8003.

## D. Mutations that are not yet reachable  ⬜

- [ ] D1 Create meeting from a form (title, date, participants, tags, pasted
      transcript, `generate_summary` checkbox).
      **Check:** create one; it appears in the library and opens with notes.
- [ ] D2 Upload a `.vtt` through the UI.
      **Check:** upload; lands on the new meeting; speakers render as
      `Speaker 1` with no invented participants.
- [ ] D3 Action items: add, edit text, set assignee and due date, delete.
      **Check:** each persists across a hard refresh.
- [ ] D4 Delete meeting -> confirmation modal -> toast -> redirect to library.
      **Check:** deleted row is gone after refresh.

## E. Fidelity pass  ⬜

- [ ] E1 No `font-semibold` / `font-bold` anywhere (design is 400/500 only).
- [ ] E2 Logo mark is `#6938EF`, not black.
- [ ] E3 Settings and Team as honest "Coming Soon" placeholders using the
      card-per-row pattern.
- [ ] E4 Radius ladder respected: 4 default, 8 thumbnails, 12 rows, 16 modals.

## F. Edge cases that seed data will not surface  ⬜

- [ ] F1 `manual` meeting with `duration_ms: 0` and `summary: null` renders an
      honest empty notepad, no infinite spinner.
- [ ] F2 Uploaded meeting with all `participant_id: null` speakers renders.
- [ ] F3 `/notebook/999999` -> clean not-found, no crash.
- [ ] F4 422 on blank title renders as an inline field error, not raw JSON.

## G. Ship  ⬜

- [ ] G1 README: setup, architecture, schema, API table, what is mocked and why,
      the LLM-optional design.
- [ ] G2 `PLAN.md` / `WORKLOG.md` reconciled with reality, including that the
      first frontend pass was generated externally and reviewed.
- [ ] G3 Delete stray `openapi.json` from the repo root.
- [ ] G4 Rotate the Groq key. It is in a chat transcript in plaintext.
- [ ] G5 Deployment — still blocked on the AWS sign-off question.

---

## Log

| # | Item | Verified in Chrome | Notes |
|---|---|---|---|
| A1 | Progress rail + drag | yes | Dragged to 60%: 00:10 -> 04:40, fill 59.9%, active sentence changed. Rail 937px, notes column only. |
| A2 | Skip ±10s | yes | 00:00 -> 00:10 -> 00:20 -> 00:10. Exactly 10,000ms. |
| A3 | Speed cycle | yes | 1 -> 1.25 -> 1.5 -> 2 -> 0.5 -> 1. Was a 3-value cycle; now 5. |
| B1 | POST /api/query | curl | LLM answer + resolvable citation; keyword fallback with no key; 422 on short question; meeting_ids scoping. 29/29 no regression. |
| B2 | Ask panel behaviour | user | Timestamp updated on citation click. Appearance rejected -> ROUND-3.md. |
| -- | Seek did not scroll transcript | user | Auto-scroll was gated on `playing`, so arriving via a citation never scrolled. Now any jump >2s counts as a seek and scrolls even while paused, and clears manual-scroll suspension. |
