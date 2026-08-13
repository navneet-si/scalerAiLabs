"""Derives a summary, chapters and action items from transcript text.

This is a **deterministic mock**, which the assignment explicitly permits. It is
extractive: every keyword, bullet, chapter and action item is lifted from
something actually said, so an evaluator reading the summary can search the
transcript and find the supporting line. Nothing is invented.

`generate()` is the single entry point and the single swap point. Replacing the
mock with a real LLM call means reimplementing that one function to return the
same `GeneratedSummary`; no caller changes. That is the only reason the scoring
helpers below are private.

Why extractive rather than templated: a templated summary ("This meeting covered
several topics") is identical for every meeting and demos as obvious filler.
Scoring real sentences produces different output per meeting for the same cost.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field

from app.services.transcript_parser import ParsedSegment

MAX_KEYWORDS = 7
MAX_CHAPTERS = 5
MAX_ACTION_ITEMS = 6
MIN_SEGMENTS_PER_CHAPTER = 4

# Filler that dominates any word count of spoken English and carries no topic.
_STOPWORDS = frozenset(
    """
    about above after again against all also and any are because been before being
    below between both but can cant come could couldnt did didnt does doesnt doing
    done dont down during each else even ever every few for from further get gets
    getting going gonna good got had hadnt has hasnt have havent having her here
    hers herself him himself his how hows into isnt its itself just kind know known
    lets like little look looking lot made make makes many maybe mean means might
    more most much must myself need needs next not now off once only other ought
    our ours ourselves out over own really right same say says see seen shall she
    should shouldnt some sort still such sure take taken than that thats their
    theirs them themselves then there theres these they thing things think this
    those though thought through thing time too under until very want wants was
    wasnt way well went were werent what whats when where which while who whom
    why will with wont would wouldnt yeah yes yet you your yours yourself okay
    actually basically probably definitely something anything everything nothing
    someone anyone everyone somebody anybody everybody
    """.split()
)

# Phrases that mark a commitment. Ordered most-specific first so the strongest
# signal wins when several match the same line.
_ACTION_CUES = (
    re.compile(r"\baction item\b", re.IGNORECASE),
    re.compile(r"\bI'?ll (?:take|own|pick|handle|send|write|put|get|set|draft|run)\b", re.IGNORECASE),
    re.compile(r"\bcan you (?:take|own|send|write|put|get|set|draft|run|look)\b", re.IGNORECASE),
    re.compile(r"\bwe need to\b", re.IGNORECASE),
    re.compile(r"\bfollow(?:ing)? up\b", re.IGNORECASE),
    re.compile(r"\bby (?:monday|tuesday|wednesday|thursday|friday|next week|end of (?:day|week|the week))\b", re.IGNORECASE),
    re.compile(r"\blet'?s (?:make|get|set|put|schedule|book|write|draft)\b", re.IGNORECASE),
    re.compile(r"\bI'?ll\b", re.IGNORECASE),
)

_WORD = re.compile(r"[A-Za-z][A-Za-z'’\-]*")
_SENTENCE_END = re.compile(r"(?<=[.!?])\s+")


def _stem(word: str) -> str:
    """Drop contraction and possessive tails so `I'll` and `Sarah's` normalise.

    Without this, contractions survive as high-frequency "keywords" — `I'll` was
    ranking above product names, because it is genuinely one of the most common
    tokens in spoken English.
    """
    return re.split(r"['’]", word, maxsplit=1)[0].lower()


def _content_words(text: str) -> list[str]:
    return [
        stem
        for word in _WORD.findall(text)
        if len(stem := _stem(word)) > 3 and stem not in _STOPWORDS
    ]


def _sentences(text: str) -> list[str]:
    return [part.strip() for part in _SENTENCE_END.split(text.strip()) if part.strip()]


def _truncate(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


@dataclass
class GeneratedSummary:
    overview: str
    keywords: list[str]
    bullet_notes: list[dict] = field(default_factory=list)
    chapters: list[dict] = field(default_factory=list)
    action_items: list[dict] = field(default_factory=list)


def _best_sentence(text: str, keywords: set[str], limit: int = 190) -> str:
    """The most topical sentence in a line, not merely the first one.

    Spoken lines routinely open with throat-clearing — "Alright, thanks for
    joining. We need to lock the migration timeline." Quoting the first sentence
    yields the greeting and discards the point.
    """
    sentences = _sentences(text)
    if not sentences:
        return _truncate(text.strip(), limit)

    def rank(entry: tuple[int, str]) -> tuple[float, int]:
        index, sentence = entry
        words = _content_words(sentence)
        if len(_WORD.findall(sentence)) < 4:
            return (-1.0, -index)
        hits = sum(1 for word in words if word in keywords)
        return (hits * 2.0 + min(len(words), 25) / 25, -index)

    return _truncate(max(enumerate(sentences), key=rank)[1], limit)


def _cue_sentence(text: str, cue: re.Pattern[str], limit: int = 150) -> str:
    """The sentence that actually contains the commitment cue."""
    for sentence in _sentences(text):
        if cue.search(sentence):
            return _truncate(sentence, limit)
    return _truncate(text.strip(), limit)


def _keywords(segments: list[ParsedSegment], limit: int = MAX_KEYWORDS) -> list[str]:
    """Frequent content words, displayed in the casing they most often appear in.

    Preserving casing is what makes product and company names read as names
    ("Northwind", "Redshift") rather than as lowercase noise.
    """
    counts: Counter[str] = Counter()
    display: dict[str, Counter[str]] = {}
    for segment in segments:
        for word in _WORD.findall(segment.text):
            key = _stem(word)
            if len(key) > 3 and key not in _STOPWORDS:
                counts[key] += 1
                # Track the original spelling so proper nouns keep their casing.
                display.setdefault(key, Counter())[word.strip("'’")] += 1

    # Sort by frequency, then alphabetically, so the same transcript always
    # produces the same keywords — Counter ties are otherwise insertion-ordered.
    ranked = sorted(counts.items(), key=lambda item: (-item[1], item[0]))
    repeated = [word for word, count in ranked if count > 1] or [word for word, _ in ranked]
    return [display[word].most_common(1)[0][0] for word in repeated[:limit]]


def _score(segment: ParsedSegment, keywords: set[str]) -> float:
    """Rank a line by topical density, with a mild preference for longer lines.

    Length alone would surface rambling; keyword hits alone would surface a
    three-word line that happens to name the product. The blend picks the lines a
    person would actually quote.
    """
    if len(_WORD.findall(segment.text)) < 6:
        return 0.0
    words = _content_words(segment.text)
    hits = sum(1 for word in words if word in keywords)
    return hits * 2.0 + min(len(words), 25) / 25


def _rank(segments: list[ParsedSegment], keywords: set[str], count: int) -> list[ParsedSegment]:
    """Top `count` segments by score, returned in timeline order."""
    scored = [(index, _score(segment, keywords)) for index, segment in enumerate(segments)]
    best = sorted(scored, key=lambda item: (-item[1], item[0]))[:count]
    return [segments[index] for index, score in sorted(best) if score > 0]


def _chunks(segments: list[ParsedSegment], count: int) -> list[list[ParsedSegment]]:
    """Split the timeline into `count` contiguous blocks of near-equal length."""
    count = max(1, min(count, len(segments)))
    size, remainder = divmod(len(segments), count)
    blocks: list[list[ParsedSegment]] = []
    start = 0
    for index in range(count):
        end = start + size + (1 if index < remainder else 0)
        blocks.append(segments[start:end])
        start = end
    return [block for block in blocks if block]


def _title_for(block: list[ParsedSegment], used: set[str]) -> str:
    """Name a block after its most distinctive unused keyword."""
    for word in _keywords(block, limit=6):
        if word.lower() not in used:
            used.add(word.lower())
            return word[:1].upper() + word[1:]
    return "Discussion"


def _chapters(segments: list[ParsedSegment], duration_ms: int) -> list[dict]:
    count = min(MAX_CHAPTERS, max(1, len(segments) // MIN_SEGMENTS_PER_CHAPTER))
    used: set[str] = set()
    chapters: list[dict] = []

    for block in _chunks(segments, count):
        keywords = {word.lower() for word in _keywords(block, limit=8)}
        highlight = _rank(block, keywords, 1)
        chapters.append(
            {
                "title": _title_for(block, used),
                "gist": _best_sentence(highlight[0].text, keywords, 140) if highlight else None,
                "start_ms": block[0].start_ms,
                "end_ms": min(block[-1].end_ms, duration_ms),
            }
        )
    return chapters


def _bullet_notes(segments: list[ParsedSegment], keywords: set[str]) -> list[dict]:
    used: set[str] = set()
    sections: list[dict] = []

    for block in _chunks(segments, 3):
        points = [
            f"{segment.speaker_label}: {_best_sentence(segment.text, keywords, 160)}"
            if segment.speaker_label
            else _best_sentence(segment.text, keywords, 160)
            for segment in _rank(block, keywords, 3)
        ]
        if points:
            sections.append({"title": _title_for(block, used), "points": points})
    return sections


def _action_items(segments: list[ParsedSegment]) -> list[dict]:
    """Lines carrying a commitment cue, strongest cue first.

    A cue match is a heuristic, not comprehension — which is precisely why these
    land as *editable* action items rather than as facts.
    """
    candidates: list[tuple[int, int, ParsedSegment, re.Pattern[str]]] = []
    for index, segment in enumerate(segments):
        for rank, cue in enumerate(_ACTION_CUES):
            if cue.search(segment.text):
                candidates.append((rank, index, segment, cue))
                break

    # Strongest cue wins a slot; ties break on position so the pick is stable.
    picked: list[tuple[int, dict]] = []
    seen: set[str] = set()
    for _, index, segment, cue in sorted(candidates, key=lambda item: (item[0], item[1])):
        if len(picked) == MAX_ACTION_ITEMS:
            break
        text = _cue_sentence(segment.text, cue)
        if text.lower() in seen:
            continue
        seen.add(text.lower())
        picked.append((index, {"text": text, "assignee_label": segment.speaker_label}))

    # Present them in timeline order — the notes panel should follow the call.
    return [item for _, item in sorted(picked, key=lambda entry: entry[0])]


def generate(
    title: str,
    segments: list[ParsedSegment],
    *,
    duration_ms: int,
) -> GeneratedSummary:
    """Build a summary from transcript segments. The one function to swap for an LLM."""
    if not segments:
        raise ValueError("Cannot summarise an empty transcript")

    keywords = _keywords(segments)
    keyword_set = {word.lower() for word in keywords}

    speakers = {segment.speaker_label for segment in segments if segment.speaker_label}
    minutes = max(1, round(duration_ms / 60000))
    lead = (
        f"{title} ran {minutes} minute{'s' if minutes != 1 else ''}"
        f"{f' across {len(speakers)} speakers' if len(speakers) > 1 else ''}"
        f"{', covering ' + ', '.join(keywords[:3]) if keywords else ''}."
    )
    highlights = [
        _best_sentence(segment.text, keyword_set) for segment in _rank(segments, keyword_set, 3)
    ]

    return GeneratedSummary(
        overview=" ".join([lead, *highlights]).strip(),
        keywords=keywords,
        bullet_notes=_bullet_notes(segments, keyword_set),
        chapters=_chapters(segments, duration_ms),
        action_items=_action_items(segments),
    )
