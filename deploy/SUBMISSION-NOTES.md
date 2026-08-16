# Assumptions / Mocked Data / Notes — submission field text

Live demo: http://3.6.151.99 · API docs: http://3.6.151.99/docs

---

**No authentication.** The assignment allowed this. One seeded participant
(`alex.rivera@northwind.io`) is flagged `is_current_user` and treated as the logged-in user.
The demo is therefore world-writable — anyone with the link can create, edit or delete
meetings.

**No speech-to-text.** This is the main deliberate omission, and it is out of scope per the
brief. Transcripts come from seed fixtures or from uploaded `.vtt` / `.json` / `.txt` files,
which are parsed into timed segments. Audio and video uploads are **rejected with a clear
message** rather than silently accepted — I chose an honest refusal over generating a
placeholder transcript, since a fabricated transcript that reads as genuine is worse than a
visible limitation.

**Playback is a virtual clock.** Seeded meetings have no `audio_url`, so the player advances a
timer over the real segment timestamps — transcript highlighting, seeking, chapter jumps and
the progress bar are all driven by it. If a meeting does have an `audio_url`, a real
`<audio>` element is used instead.

**Summaries, chapters and action items are generated deterministically, not by an LLM.**
`summarizer.generate()` is an *extractive* mock: it scores real transcript sentences by
keyword density and quotes them, so every keyword, bullet, chapter and action item traces back
to a line you can find in the transcript. Action items come from commitment cues ("I'll
take…", "can you send…", "by Friday"), which is pattern matching rather than comprehension —
hence they are fully editable in the UI. Rows are stamped `generated_by` (`"seed"` for fixture
data, `"mock"` for generated), so the provenance is visible in the data, not just the code.
This one function is the single swap point for a real LLM.

**The cross-meeting Q&A is a real LLM.** `POST /api/query` uses Groq
(`llama-3.3-70b-versatile`) over retrieved transcript lines and returns citations that
deep-link to `/notebook/{id}?t=<ms>`, landing on the exact cited line. With no API key
configured it falls back to keyword retrieval instead of failing; the response reports which
path ran via `answered_by`.

**Derived timings.** Transcript segments carry real start/end times. Sentence-level times
*within* a segment are interpolated proportionally by character count, which is what makes
click-a-sentence-to-seek work at sub-segment resolution. Pasted text with no timings at all is
timed at ~2.75 words/second so it is playable rather than a wall of text.

**Speaker labels are not invented people.** An uploaded `.vtt` containing `Speaker 1` produces
a speaker row with `participant_id = NULL`, not a fabricated participant. Inventing one would
pollute the participant list and corrupt the library's participant filter.

**Data model.** SQLite with `create_all` rather than migrations — with a single-instance
deployment there is no migration story worth maintaining. Seed data (5 meetings, 174 segments,
10 participants, 22 chapters, 22 action items) loads on first boot only, when the meetings
table is empty, so restarts do not duplicate it. Fixture dates are stored as `days_ago`
offsets and resolved at load time, so the library always looks current.

**Presentational UI.** The clone reproduces Fireflies' chrome, and some of it is visual only:
the Upgrade and Capture buttons, the channels sidebar, the Slack/Gmail connector banner, the
model picker and the AskFred "Recents" list do nothing. Settings and Team are explicit
"available in a future update" placeholders rather than fake working screens.

**Deployment.** Single EC2 host: nginx on port 80 reverse-proxying a Next.js standalone server
and the FastAPI app, with SQLite in a Docker volume. Frontend and API share one origin, so
there is no CORS configuration in production. HTTP only — a bare Elastic IP cannot have a TLS
certificate without a domain name.

**Not implemented.** Export (PDF/Markdown/TXT), dark mode, comments and soundbites — all
listed as bonus items.
