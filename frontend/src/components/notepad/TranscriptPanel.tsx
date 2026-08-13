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

export function TranscriptPanel({ transcript, currentTimeMs, playing, onSeek }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [autoScroll, setAutoScroll] = useState(true);
  
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
      // If user scrolls manually, suspend auto-scroll
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
            className="pl-9 !h-8 text-[14px]" 
            placeholder="Find or Replace" 
          />
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
