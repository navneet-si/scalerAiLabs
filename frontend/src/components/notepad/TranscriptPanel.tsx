"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { SpeakerRead, TranscriptRead } from "@/lib/types";
import { Sentence, splitSentences, flattenSentences, findActiveSentenceIndex } from "@/lib/sentences";
import { TranscriptParagraph } from "./TranscriptParagraph";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

type TranscriptPanelProps = {
  transcript: TranscriptRead;
  currentTimeMs: number;
  playing: boolean;
  onSeek: (ms: number) => void;
};

/**
 * TranscriptPanel is the core component for displaying and interacting with meeting transcripts.
 * It manages several complex states:
 * 1. Synchronizing the active sentence highlight with the current audio playback time (`currentTimeMs`).
 * 2. An advanced, case-insensitive textual search index that maps matches to their byte-offsets.
 * 3. Auto-scrolling the viewport to keep the active sentence vertically centered (~45% from the top).
 * 4. Suspending auto-scroll when the user manually scrolls, so they aren't forced back to the active line.
 */
export function TranscriptPanel({ transcript, currentTimeMs, playing, onSeek }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [autoScroll, setAutoScroll] = useState(true);
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);

  // Memoize sentences to prevent churn
  const { sentenceSegments, flatSentences } = useMemo(() => {
    const segments = splitSentences(transcript.segments);
    const flat = flattenSentences(segments);
    return { sentenceSegments: segments, flatSentences: flat };
  }, [transcript]);

  // Find active sentence using binary search
  const activeIndex = useMemo(() => {
    return findActiveSentenceIndex(flatSentences, currentTimeMs);
  }, [flatSentences, currentTimeMs]);

  const activeSentenceId = activeIndex >= 0 ? flatSentences[activeIndex].id : null;
  const activeSegmentId = activeIndex >= 0 ? flatSentences[activeIndex].segment_id : null;

  // Every occurrence of the query, in transcript order. One entry per occurrence,
  // not per sentence — a line containing the word twice is two stops.
  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const found: {
      sentenceId: string;
      segmentId: number;
      startMs: number;
      occurrence: number;
    }[] = [];

    for (const s of flatSentences) {
      const haystack = s.text.toLowerCase();
      let cursor = 0;
      let occurrence = 0;
      for (;;) {
        const at = haystack.indexOf(trimmed, cursor);
        if (at === -1) break;
        found.push({
          sentenceId: s.id,
          segmentId: s.segment_id,
          startMs: s.start_ms,
          occurrence,
        });
        cursor = at + trimmed.length;
        occurrence++;
      }
    }

    return found;
  }, [flatSentences, query]);

  // A new query invalidates the old position.
  useEffect(() => {
    setMatchIndex(0);
  }, [query]);

  // matchIndex is reset by an effect when the query changes, which lands one render
  // later — modulo here keeps the counter honest in that gap instead of showing "9 of 3".
  const safeIndex = matches.length > 0 ? matchIndex % matches.length : 0;
  const currentMatch = matches.length > 0 ? matches[safeIndex] : null;

  const stepMatch = useCallback(
    (delta: number) => {
      if (matches.length === 0) return;
      const next = (matchIndex + delta + matches.length) % matches.length;
      setMatchIndex(next);
      // Reuse the tested seek path: the panel already scrolls the active line to
      // ~45% whenever the clock jumps, and this puts the match under the playhead.
      onSeek(matches[next].startMs);
    },
    [matches, matchIndex, onSeek],
  );

  // Seeking alone does not scroll when two matches sit less than the 2s seek
  // threshold apart, so drive the scroll off the match itself as well.
  useEffect(() => {
    if (!currentMatch) return;
    const container = scrollRef.current;
    if (!container) return;

    // We locate the DOM node of the sentence containing the match by its data attribute
    const node = container.querySelector(
      `[data-sentence-id="${currentMatch.sentenceId}"]`,
    ) as HTMLElement | null;
    if (!node) return;

    // Land the active match at ~45% of the panel height
    const targetY = node.offsetTop - container.clientHeight * 0.45;
    if (Math.abs(container.scrollTop - targetY) > 5) {
      container.scrollTo({ top: Math.max(0, targetY), behavior: "smooth" });
    }
  }, [currentMatch]);

  // Stable identity, or every paragraph re-renders on each tick regardless of memo.
  const handleSentenceClick = useCallback(
    (ms: number) => {
      onSeek(ms);
      setAutoScroll(true);
    },
    [onSeek],
  );

  // A jump larger than a playback tick is a seek — a citation, a timestamp click,
  // a chapter, or a drag on the progress rail. Playback advances in ~250ms steps,
  // so anything past 2s did not get there by playing.
  const prevTimeRef = useRef(currentTimeMs);
  const seeked = Math.abs(currentTimeMs - prevTimeRef.current) > 2000;
  useEffect(() => {
    prevTimeRef.current = currentTimeMs;
  }, [currentTimeMs]);

  // Auto-scroll on playback, and on any explicit seek even while paused.
  // Gating this on `playing` alone was the bug: arriving from a citation seeks
  // and repaints the highlight, but the panel stayed wherever it was.
  useEffect(() => {
    if (!activeSentenceId) return;
    if (!seeked && (!playing || !autoScroll)) return;

    const container = scrollRef.current;
    if (!container) return;

    const activeNode = container.querySelector(`[data-sentence-id="${activeSentenceId}"]`) as HTMLElement;
    if (!activeNode) return;

    // A seek is an explicit request to go somewhere, so it also cancels any
    // earlier manual-scroll suspension.
    if (seeked && !autoScroll) setAutoScroll(true);

    const containerHeight = container.clientHeight;
    // Land the active line at ~45% of the panel, as measured on the reference.
    const targetY = activeNode.offsetTop - (containerHeight * 0.45);

    if (Math.abs(container.scrollTop - targetY) > 5) {
      container.scrollTo({
        top: Math.max(0, targetY),
        behavior: "smooth"
      });
    }
  }, [activeSentenceId, playing, autoScroll, seeked]);

  // Handle manual scroll to suspend auto-scroll
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (!playing) return;
      // If user scrolls manually while playing, we suspend auto-scroll.
      // This prevents the UI from aggressively yanking the user back to the playhead
      // when they are trying to read ahead or behind.
      setAutoScroll(false);
    };
    
    // Add wheel/touch listener to distinguish manual scroll from smooth scroll
    container.addEventListener("wheel", handleScroll, { passive: true });
    container.addEventListener("touchmove", handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener("wheel", handleScroll);
      container.removeEventListener("touchmove", handleScroll);
    };
  }, [playing]);

  // Map speaker_id to speaker object
  const speakerMap = useMemo(() => {
    const map = new Map<number, SpeakerRead>();
    transcript.speakers.forEach(s => map.set(s.id, s));
    return map;
  }, [transcript.speakers]);

  // Helper for unresolved speakers
  const getSpeaker = (speakerId: number | null): SpeakerRead => {
    if (speakerId !== null && speakerMap.has(speakerId)) {
      return speakerMap.get(speakerId)!;
    }
    return {
      id: -1,
      label: "Unknown",
      color: "#98A2B3",
      display_order: 999,
      participant_id: null
    };
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-[var(--color-gray-200)] relative">
      {/* Top Bar */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--color-gray-200)] flex-shrink-0">
        <div className="relative w-full max-w-sm">
          <svg className="absolute left-3 top-2 text-[var(--color-gray-400)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <Input
            className="pl-9 pr-28 !h-8 text-[14px]"
            placeholder="Find in transcript"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                stepMatch(e.shiftKey ? -1 : 1);
              } else if (e.key === "Escape") {
                e.preventDefault();
                setQuery("");
              }
            }}
          />

          {query.trim() && (
            <div className="absolute right-1.5 top-1 flex items-center gap-0.5">
              <span
                className={`text-[12px] tabular-nums mr-1 ${
                  matches.length === 0
                    ? "text-[var(--color-pink-700)]"
                    : "text-[var(--color-gray-500)]"
                }`}
              >
                {matches.length === 0 ? "No results" : `${safeIndex + 1} of ${matches.length}`}
              </span>

              <button
                aria-label="Previous match"
                disabled={matches.length === 0}
                onClick={() => stepMatch(-1)}
                className="p-1 rounded text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] disabled:opacity-40 disabled:hover:bg-transparent outline-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
              </button>

              <button
                aria-label="Next match"
                disabled={matches.length === 0}
                onClick={() => stepMatch(1)}
                className="p-1 rounded text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] disabled:opacity-40 disabled:hover:bg-transparent outline-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>

              <button
                aria-label="Clear search"
                onClick={() => setQuery("")}
                className="p-1 rounded text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-gray-700)] outline-none"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Transcript Scroll Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-auto p-6 pb-32"
      >
        <div className="max-w-[598px]">
          {sentenceSegments.map(({ segment, sentences }) => (
            <TranscriptParagraph
              key={segment.id}
              speaker={getSpeaker(segment.speaker_id)}
              sentences={sentences}
              // Only the paragraph that owns the active sentence is told about it.
              // Passing activeSentenceId to every paragraph would change a prop on
              // all of them at each sentence boundary, defeating the memo entirely.
              activeSentenceId={segment.id === activeSegmentId ? activeSentenceId : null}
              onSentenceClick={handleSentenceClick}
              searchQuery={query.trim()}
              // Same reasoning as activeSentenceId: only the paragraph holding the
              // current match hears about it, so stepping re-renders two paragraphs.
              activeMatchSentenceId={
                currentMatch && segment.id === currentMatch.segmentId
                  ? currentMatch.sentenceId
                  : null
              }
              activeMatchOccurrence={currentMatch ? currentMatch.occurrence : -1}
            />
          ))}
        </div>
      </div>

      {/* Jump to current pill */}
      {!autoScroll && playing && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
          <Button 
            variant="secondary" 
            className="rounded-full shadow-[var(--shadow-modal)] px-4 bg-white font-medium"
            onClick={() => {
              setAutoScroll(true);
              // Small timeout to allow the state to set before the effect runs
              setTimeout(() => {
                if (!activeSentenceId || !scrollRef.current) return;
                const activeNode = scrollRef.current.querySelector(`[data-sentence-id="${activeSentenceId}"]`) as HTMLElement;
                if (activeNode) {
                  scrollRef.current.scrollTo({
                    top: Math.max(0, activeNode.offsetTop - (scrollRef.current.clientHeight * 0.45)),
                    behavior: "smooth"
                  });
                }
              }, 50);
            }}
          >
            Jump to current
          </Button>
        </div>
      )}
    </div>
  );
}
