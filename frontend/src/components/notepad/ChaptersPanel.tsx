import React from "react";
import { ChapterRead } from "@/lib/types";
import { formatMs } from "@/lib/time";

type ChaptersPanelProps = {
  chapters: ChapterRead[];
  onSeek: (ms: number) => void;
  /** Rendered inside the notes document, which supplies its own padding and heading. */
  bare?: boolean;
};

export function ChaptersPanel({ chapters, onSeek, bare = false }: ChaptersPanelProps) {
  if (chapters.length === 0) {
    if (bare) return null;
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-2">No chapters</h3>
        <p className="text-[14px] text-[var(--color-gray-500)] max-w-sm">
          No chapters were generated for this meeting.
        </p>
      </div>
    );
  }

  return (
    <div className={bare ? "" : "p-8 max-w-3xl"}>
      <div className="flex flex-col">
        {chapters.map((chap, i) => {
          const isLast = i === chapters.length - 1;
          return (
            <div key={chap.id} className="flex gap-6 group cursor-pointer" onClick={() => onSeek(chap.start_ms)}>
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-[var(--color-gray-300)] group-hover:bg-[var(--color-purple-500)] transition-colors" />
                {!isLast && <div className="w-[2px] flex-1 bg-[var(--color-gray-200)] my-1 min-h-[40px]" />}
              </div>
              
              <div className="flex-1 pb-8 -mt-1.5">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[14px] font-medium text-[var(--color-blue-700)] group-hover:underline">
                    {formatMs(chap.start_ms)}
                  </span>
                  <span className="text-[16px] font-medium text-[var(--color-gray-900)]">
                    {chap.title}
                  </span>
                </div>
                {chap.gist && (
                  <p className="text-[14px] text-[var(--color-gray-500)] leading-relaxed mt-2">
                    {chap.gist}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
