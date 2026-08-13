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
      <div className="flex items-center gap-2 mb-3">
        <Checkbox 
          checked={allSelected} 
          onChange={(e) => onToggleGroup(e.target.checked)} 
        />
        <h2 className="text-[14px] font-medium text-[var(--color-gray-900)]">
          {dateLabel}
        </h2>
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
