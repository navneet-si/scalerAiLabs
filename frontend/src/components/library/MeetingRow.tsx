import React, { useState } from "react";
import Link from "next/link";
import { MeetingListItem } from "@/lib/types";
import { formatMsToMinutes } from "@/lib/time";
import { Checkbox } from "../ui/Checkbox";

type MeetingRowProps = {
  meeting: MeetingListItem;
  checked: boolean;
  onToggle: (checked: boolean) => void;
};

// Formats date string from ISO format
function formatMeetingDateShort(isoDate: string) {
  const d = new Date(isoDate);
  const mmm = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const yyyy = d.getFullYear();
  const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${mmm} ${day}, ${yyyy} · ${time}`;
}

export function MeetingRow({ meeting, checked, onToggle }: MeetingRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const organizer = meeting.participants.find(p => p.is_current_user) || meeting.participants[0];
  const hostName = organizer ? organizer.name : "Unknown Host";
  
  const formattedDate = formatMeetingDateShort(meeting.meeting_date);
  const minutes = formatMsToMinutes(meeting.duration_ms);
  
  // Opacity styles based on processing status
  const rowOpacity = meeting.status === "processing" ? "opacity-50" : "opacity-100";
  
  return (
    <div 
      className={`group flex items-center justify-between p-4 max-w-[789px] h-[78px] bg-white border border-[var(--color-gray-100)] rounded-[12px] transition-colors hover:bg-[var(--color-gray-50)] text-[var(--color-gray-900)] hover:text-[var(--color-purple-700)] ${rowOpacity} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-4 h-full">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center relative">
          {(isHovered || checked) ? (
            <div className="absolute inset-0 flex items-center justify-center">
               <Checkbox checked={checked} onChange={(e) => onToggle(e.target.checked)} />
            </div>
          ) : (
            <div className="w-10 h-10 bg-[var(--color-gray-100)] rounded-lg flex items-center justify-center">
              <svg className="text-[var(--color-gray-400)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a10 10 0 1 0 10 10H12V2z"/><path d="M12 12 2.1 7.1"/></svg>
            </div>
          )}
        </div>
        
        <div className="flex flex-col justify-center">
          <Link href={`/notebook/${meeting.id}`} className="text-[14px] font-normal leading-tight group-hover:text-[var(--color-purple-700)] text-[var(--color-gray-900)] flex items-center gap-1">
            <span className="font-medium">{meeting.title}</span> 
            <span className="text-[14px]">›</span>
          </Link>
          <div className="text-[14px] text-[var(--color-gray-500)] leading-tight mt-1">
            {formattedDate} · {minutes} min · {hostName}
          </div>
        </div>
      </div>
      
      {/* Right actions, visible only on hover */}
      <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered ? "opacity-100" : "opacity-0"}`}>
        <button className="w-8 h-8 rounded text-[var(--color-gray-500)] hover:bg-[var(--color-gray-200)] flex items-center justify-center outline-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
        </button>
        <Link href={`/notebook/${meeting.id}`} className="px-3 py-1.5 rounded text-[14px] font-medium text-[var(--color-gray-700)] bg-white border border-[var(--color-gray-200)] shadow-sm hover:bg-[var(--color-gray-50)]">
          Details ›
        </Link>
      </div>
    </div>
  );
}
