import React from "react";
import { Checkbox } from "../ui/Checkbox";
import { MeetingRow } from "./MeetingRow";
import { MeetingListItem } from "@/lib/types";

type DateGroupProps = {
  dateLabel: string;
  meetings: MeetingListItem[];
  selectedIds: Set<number>;
  onToggleMeeting: (id: number, checked: boolean) => void;
  onToggleGroup: (checked: boolean) => void;
};

// Represents a grouped section by date
export function DateGroup({ dateLabel, meetings, selectedIds, onToggleMeeting, onToggleGroup }: DateGroupProps) {
  // Check if all meetings in this group are selected
  const allSelected = meetings.every(m => selectedIds.has(m.id)) && meetings.length > 0;

  return (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={allSelected} 
            onChange={(e) => onToggleGroup(e.target.checked)} 
          />
          <h2 className="text-[14px] font-medium text-[var(--color-gray-900)]">
            {dateLabel}
          </h2>
        </div>
        
        <button className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors pr-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          Feedback
        </button>
      </div>
      
      <div className="flex flex-col gap-2">
        {meetings.map((meeting) => (
          <MeetingRow 
            key={meeting.id} 
            meeting={meeting} 
            checked={selectedIds.has(meeting.id)} 
            onToggle={(checked) => onToggleMeeting(meeting.id, checked)}
          />
        ))}
      </div>
    </div>
  );
}
