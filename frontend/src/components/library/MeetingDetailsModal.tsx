import React, { useEffect, useRef } from "react";
import { MeetingListItem } from "@/lib/types";

type MeetingDetailsModalProps = {
  meeting: MeetingListItem;
  onClose: () => void;
};

// Formats date string from ISO format
function formatMeetingDateShort(isoDate: string) {
  const d = new Date(isoDate);
  const mmm = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const yyyy = d.getFullYear();
  return `${mmm} ${day}, ${yyyy}`;
}

function formatMeetingTime(isoDate: string) {
  const d = new Date(isoDate);
  return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function getEndTime(isoDate: string, durationMs: number) {
  const d = new Date(new Date(isoDate).getTime() + durationMs);
  return d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function MeetingDetailsModal({ meeting, onClose }: MeetingDetailsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const organizer = meeting.participants.find((p) => p.is_current_user) || meeting.participants[0];
  const hostName = organizer ? organizer.name : "Unknown Host";

  const dateStr = formatMeetingDateShort(meeting.meeting_date);
  const timeStr = formatMeetingTime(meeting.meeting_date);
  const endTimeStr = getEndTime(meeting.meeting_date, meeting.duration_ms);

  const dayStr = new Date(meeting.meeting_date).toLocaleString("en-US", { weekday: "short" });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(12,12,13,0.56)]">
      <div 
        ref={modalRef}
        className="bg-white rounded-[16px] w-[615px] p-6 shadow-[var(--shadow-modal)] relative flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-12 h-12 flex-shrink-0 border border-[var(--color-gray-200)] rounded-lg flex items-center justify-center text-[var(--color-gray-500)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-[16px] font-medium text-[var(--color-gray-900)] leading-tight mb-1">
                {meeting.title}
              </h2>
              <div className="text-[14px] text-[var(--color-gray-500)]">
                {hostName} · {dayStr}, {dateStr} · {timeStr} · English (Global)
              </div>
            </div>
          </div>
          <button className="w-8 h-8 flex items-center justify-center border border-[var(--color-gray-200)] rounded outline-none hover:bg-[var(--color-gray-50)] text-[var(--color-gray-500)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>

        {/* Summary Panel */}
        <div className="bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-lg p-4 flex gap-3">
          <div className="text-[var(--color-purple-600)] flex-shrink-0 mt-0.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
              <line x1="12" y1="22.08" x2="12" y2="12"></line>
            </svg>
          </div>
          <div className="text-[14px] text-[var(--color-gray-700)] leading-relaxed">
            {meeting.description || "The meeting focused on discussing project updates, reviewing action items, and establishing next steps for the upcoming development cycles."}
          </div>
        </div>

        {/* Details Grid */}
        <div className="flex flex-col gap-6">
          {/* Privacy */}
          <div className="flex">
            <div className="w-[120px] flex-shrink-0 text-[14px] font-medium text-[var(--color-gray-900)]">
              Privacy
            </div>
            <div className="flex-1 flex items-center gap-2 text-[14px] text-[var(--color-purple-700)] cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Teammates & Anyone with Link
            </div>
          </div>

          {/* Channels */}
          <div className="flex items-center">
            <div className="w-[120px] flex-shrink-0 text-[14px] font-medium text-[var(--color-gray-900)]">
              Channels
            </div>
            <div className="flex-1 flex items-center justify-between">
              <div className="text-[14px] text-[var(--color-gray-700)]">
                # All Meetings, # Shared With Me
              </div>
              <button className="text-[14px] font-medium text-[var(--color-gray-700)] border border-[var(--color-gray-200)] rounded px-3 py-1.5 hover:bg-[var(--color-gray-50)]">
                Move to channel
              </button>
            </div>
          </div>

          {/* Invited */}
          <div className="flex">
            <div className="w-[120px] flex-shrink-0 text-[14px] font-medium text-[var(--color-gray-900)] pt-1">
              Invited
            </div>
            <div className="flex-1 flex flex-col gap-4">
              {meeting.participants.map((p) => (
                <div key={`invited-${p.id}`} className="flex gap-3">
                  <div 
                    className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-[10px] font-medium text-white mt-0.5"
                    style={{ backgroundColor: p.avatar_color || "#6CE9A6" }}
                  >
                    {p.initials}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[14px] text-[var(--color-gray-900)] leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[12px] text-[var(--color-gray-500)] leading-tight mt-1">
                      {p.email || `${p.name.toLowerCase().replace(" ", ".")}@example.com`}
                      {p.id === organizer?.id && " · Host"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attended */}
          <div className="flex">
            <div className="w-[120px] flex-shrink-0 text-[14px] font-medium text-[var(--color-gray-900)] pt-1 flex items-start gap-1">
              Attended
              <div className="text-[#12B76A] mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-4">
              {meeting.participants.map((p) => (
                <div key={`attended-${p.id}`} className="flex gap-3">
                  <div 
                    className="w-6 h-6 flex-shrink-0 rounded flex items-center justify-center text-[10px] font-medium text-white mt-0.5"
                    style={{ backgroundColor: p.avatar_color || "#6CE9A6" }}
                  >
                    {p.initials}
                  </div>
                  <div className="flex flex-col">
                    <div className="text-[14px] text-[var(--color-gray-900)] leading-tight">
                      {p.name}
                    </div>
                    <div className="text-[12px] text-[var(--color-gray-500)] leading-tight mt-1">
                      {timeStr} - {endTimeStr}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
      
      {/* Click outside to close (handled by an overlay div instead to avoid event bubbling issues) */}
      <div className="absolute inset-0 z-[-1]" onClick={onClose}></div>
    </div>
  );
}
