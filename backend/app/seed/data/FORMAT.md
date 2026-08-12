# Meeting fixture format

Each `*.json` file in this directory is one seeded meeting. The same shape is
accepted by the transcript-upload endpoint, so seeding and uploading share one
parser and one set of invariants.

## Shape

```jsonc
{
  "title": "Q3 Product Roadmap Review",
  "description": "One sentence shown under the title in the library.",
  "days_ago": 1,              // meeting_date = today - days_ago (keeps the library current)
  "time": "10:00",            // UTC wall-clock time of day
  "duration_ms": 468000,      // MUST be >= the last segment's end_ms
  "tags": ["Product", "Roadmap"],
  "organizer": "Sarah Chen",  // must match a participant name
  "audio_url": null,          // optional; null means the virtual-clock player is used

  "participants": [
    { "name": "Sarah Chen", "email": "sarah.chen@northwind.io", "color": "#6366f1", "role": "host" }
  ],

  "summary": {
    "overview": "2-5 sentences of substance...",
    "keywords": ["...", "..."],                  // 5-7 items
    "bullet_notes": [                            // 2-4 grouped sections
      { "title": "Section heading", "points": ["...", "..."] }
    ]
  },

  "chapters": [
    { "title": "...", "gist": "...", "start_ms": 0, "end_ms": 37000 }
  ],

  "action_items": [
    { "text": "...", "assignee": "Sarah Chen", "due_in_days": 3, "is_done": false }
  ],

  "segments": [
    { "speaker": "Sarah Chen", "start_ms": 0, "end_ms": 11000, "text": "..." }
  ]
}
```

## Invariants (enforced by `validate_fixture` — a violation fails startup)

1. **`duration_ms` >= the last segment's `end_ms`.** The seek bar maps duration onto
   the transcript; a duration longer than the content leaves dead space on the bar,
   and a shorter one makes the final lines unreachable. Derive it from the segments —
   never invent a "realistic-sounding" meeting length.
2. **Segments are ordered and non-overlapping**: `start_ms < end_ms`, and each
   segment's `start_ms` >= the previous segment's `end_ms`.
3. **Every `segments[].speaker` must appear in `participants[]`** (matched by name).
4. **Chapters must fall inside the timeline**: `start_ms` and `end_ms` <= `duration_ms`.
   Chapter boundaries should align with actual segment boundaries.
5. `organizer` must match a participant name.

## Content guidance

- **Timing should track the text.** Roughly 2.5–3 words per second; a 20-word line is
  about 7–8 seconds. Long monologues and quick interjections should differ in length.
- **Write real dialogue.** People interrupt, disagree, ask for numbers, and change their
  minds. Avoid transcripts where everyone politely agrees — they read as filler and make
  the summary and action items meaningless.
- **The summary must be derivable from the transcript.** Every keyword, bullet, chapter
  and action item should trace to something actually said. This is what makes the app
  demo well: an evaluator reading the summary then searching the transcript should find
  the supporting line.
- **Action items should be assigned to people who accepted them on the call**, with a
  mix of `is_done` true and false.
- Emails use the `@northwind.io` domain. Reuse existing participants across meetings
  where it makes sense — they are deduplicated on email, and shared participants make
  the "filter by participant" feature meaningful.
- `color` should be a distinct hex per person, reused consistently across fixtures.

## The mocked logged-in user

`alex.rivera@northwind.io` is flagged as the current user (see `CURRENT_USER_EMAIL`
in `loader.py`). Including them in several meetings makes "my meetings" views sensible.
