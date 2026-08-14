import React, { memo } from "react";
import { Avatar } from "../ui/Avatar";
import { formatMs } from "@/lib/time";
import { SpeakerRead } from "@/lib/types";
import { Sentence } from "@/lib/sentences";

type TranscriptParagraphProps = {
  speaker: SpeakerRead;
  sentences: Sentence[];
  activeSentenceId: string | null;
  onSentenceClick: (ms: number) => void;
  // Search props are deliberately primitives. Passing a precomputed match array
  // would be a fresh reference on every render and defeat the memo below.
  searchQuery: string;
  activeMatchSentenceId: string | null;
  activeMatchOccurrence: number;
};

// Case-insensitive literal match — no RegExp, so a query of "(" or "*" is just text.
function highlight(
  text: string,
  query: string,
  isActiveSentence: boolean,
  activeOccurrence: number,
) {
  if (!query) return text;

  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  const parts: React.ReactNode[] = [];

  let cursor = 0;
  let occurrence = 0;
  let key = 0;

  for (;;) {
    const at = haystack.indexOf(needle, cursor);
    if (at === -1) break;

    if (at > cursor) parts.push(text.slice(cursor, at));

    const isCurrent = isActiveSentence && occurrence === activeOccurrence;
    parts.push(
      <mark
        key={key++}
        className={
          isCurrent
            ? "bg-[#FDB022] text-[var(--color-gray-900)] rounded-[2px]"
            : "bg-[#FEF0C7] text-[var(--color-gray-900)] rounded-[2px]"
        }
      >
        {text.slice(at, at + needle.length)}
      </mark>,
    );

    cursor = at + needle.length;
    occurrence++;
  }

  if (cursor === 0) return text;
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

// Memoized paragraph to prevent re-rendering when playback ticks
export const TranscriptParagraph = memo(function TranscriptParagraph({
  speaker,
  sentences,
  activeSentenceId,
  onSentenceClick,
  searchQuery,
  activeMatchSentenceId,
  activeMatchOccurrence
}: TranscriptParagraphProps) {
  // Use first sentence's start_ms for the paragraph timestamp
  const paragraphStartMs = sentences[0]?.start_ms || 0;
  
  return (
    <div className="flex gap-4 mb-6 group">
      <div className="mt-1">
        <Avatar
          name={speaker.label}
          initials={speaker.label.charAt(0)}
          color={speaker.color}
          shape="square"
          size={20}
        />
      </div>
      
      <div className="flex-1 max-w-[598px]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[14px] font-medium text-[var(--color-gray-700)]">
            {speaker.label}
          </span>
          <span className="text-[14px] text-[var(--color-gray-500)]">·</span>
          <button 
            className="text-[14px] text-[var(--color-blue-700)] underline outline-none"
            onClick={() => onSentenceClick(paragraphStartMs)}
          >
            {formatMs(paragraphStartMs)}
          </button>
          
          {/* Link icon on hover */}
          <button className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[var(--color-gray-400)] hover:text-[var(--color-gray-700)] outline-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
        </div>
        
        <div className="text-[16px] leading-[28px] text-[var(--color-gray-700)] py-[6px]">
          {sentences.map((s) => {
            const isActive = s.id === activeSentenceId;
            return (
              <span
                key={s.id}
                onClick={() => onSentenceClick(s.start_ms)}
                className={`cursor-pointer transition-colors duration-250 ${
                  isActive ? "text-[var(--color-pink-700)]" : "text-[var(--color-gray-700)]"
                }`}
                // Attach a data attribute so the parent can find the active DOM element
                data-sentence-id={s.id}
                data-active={isActive ? "true" : undefined}
              >
                {highlight(
                  s.text,
                  searchQuery,
                  s.id === activeMatchSentenceId,
                  activeMatchOccurrence,
                )}{" "}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
});
