// The notes panel as one continuous document, in the fixed section order:
// Keywords -> Overview -> Meeting Notes -> Time-stamped Notes -> Action Items.
//
// These were tabs before. The reference product renders them as a single
// scrolling document, and the order carries meaning — keywords orient you,
// overview summarises, notes expand, chapters index the recording.
import React from "react";
import { ActionItemRead, ChapterRead, MeetingDetail, SummaryRead } from "@/lib/types";
import { withTimestamps } from "@/lib/timestamps";
import { ChaptersPanel } from "./ChaptersPanel";
import { ActionItemsPanel } from "./ActionItemsPanel";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[18px] font-medium text-[var(--color-gray-900)] mb-4">{children}</h2>
  );
}

export function NotesDocument({
  meeting,
  summary,
  chapters,
  actionItems,
  onSeek,
  onToggleActionItem,
}: {
  meeting: MeetingDetail;
  summary: SummaryRead | null;
  chapters: ChapterRead[];
  actionItems: ActionItemRead[];
  onSeek: (ms: number) => void;
  onToggleActionItem: (id: number, checked: boolean) => void;
}) {
  // A form-created meeting with no transcript legitimately has no summary. Say so
  // plainly rather than showing a spinner that will never resolve.
  const hasNothing = !summary && chapters.length === 0 && actionItems.length === 0;

  return (
    <div className="px-10 py-8 max-w-[800px]">
      <h1 className="text-[24px] font-medium text-[var(--color-gray-900)] leading-tight">
        {meeting.title}
      </h1>
      <p className="mt-2 text-[14px] text-[var(--color-gray-500)]">
        {meeting.organizer?.name ?? "Unknown host"}
        {meeting.participants.length > 1 && ` +${meeting.participants.length - 1}`}
        {" · "}
        {new Date(meeting.meeting_date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
        {", "}
        {new Date(meeting.meeting_date).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        })}
        {meeting.source !== "seed" && (
          <span className="ml-2 text-[12px] text-[var(--color-gray-400)]">
            · {meeting.source}
          </span>
        )}
      </p>

      {meeting.tags.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {meeting.tags.map((t) => (
            <span
              key={t.id}
              className="px-2 py-0.5 text-[12px] rounded border border-[var(--color-gray-200)] text-[var(--color-gray-700)]"
            >
              {t.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-8 border-t border-[var(--color-gray-200)] pt-8">
        {hasNothing ? (
          <div className="py-16 text-center">
            <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-2">
              No notes for this meeting yet
            </h3>
            <p className="text-[14px] text-[var(--color-gray-500)] max-w-sm mx-auto">
              This meeting was created without a transcript, so there is nothing to
              summarise. Add a transcript to generate notes and action items.
            </p>
          </div>
        ) : (
          <>
            {summary && summary.keywords.length > 0 && (
              <section className="mb-10">
                <SectionHeading>Meeting Keywords</SectionHeading>
                <div className="flex gap-2 flex-wrap">
                  {summary.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[var(--color-purple-50)] text-[var(--color-purple-700)] text-[14px] rounded"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {summary && (
              <section className="mb-10">
                <SectionHeading>Meeting Overview</SectionHeading>
                <p className="text-[14px] leading-[22px] text-[var(--color-gray-700)]">
                  {withTimestamps(summary.overview, onSeek)}
                </p>
              </section>
            )}

            {summary && summary.bullet_notes.length > 0 && (
              <section className="mb-10">
                <SectionHeading>Meeting Notes</SectionHeading>
                <div className="space-y-6">
                  {summary.bullet_notes.map((section, i) => (
                    <div key={i}>
                      <h3 className="text-[14px] font-medium text-[var(--color-gray-900)] mb-2">
                        {section.title}
                      </h3>
                      <ul className="space-y-2">
                        {section.points.map((point, j) => (
                          <li
                            key={j}
                            className="text-[14px] leading-[22px] text-[var(--color-gray-700)] pl-5 relative"
                          >
                            <span className="absolute left-0 top-0">•</span>
                            {withTimestamps(point, onSeek)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {chapters.length > 0 && (
              <section className="mb-10">
                <SectionHeading>Time-stamped Notes</SectionHeading>
                <ChaptersPanel chapters={chapters} onSeek={onSeek} bare />
              </section>
            )}

            {actionItems.length > 0 && (
              <section className="mb-10">
                <SectionHeading>Action Items</SectionHeading>
                <ActionItemsPanel
                  items={actionItems}
                  onToggle={onToggleActionItem}
                  onSeek={onSeek}
                  bare
                />
              </section>
            )}

            {/* generated_by is "mock" for the offline extractive path, or
                "provider:model" when an LLM produced it. Say which, rather than
                implying a model ran when one did not. */}
            {summary && (
              <p className="mt-12 text-[12px] text-[var(--color-gray-400)]">
                {summary.generated_by === "mock"
                  ? "Summary generated by a deterministic extractive summariser — no language model was used."
                  : `Summary generated by ${summary.generated_by}.`}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
