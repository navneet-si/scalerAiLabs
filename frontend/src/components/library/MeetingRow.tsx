import React, { useState } from "react";
import Link from "next/link";
import { MeetingListItem } from "@/lib/types";
import { formatMsToMinutes } from "@/lib/time";
import { Checkbox } from "../ui/Checkbox";
import { EditMeetingModal } from "./EditMeetingModal";
import { MeetingDetailsModal } from "./MeetingDetailsModal";
import { useToast } from "../ui/Toast";

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

/**
 * Displays a single meeting in the library view.
 * Handles hover states, the contextual action menu, and rendering the meeting's
 * primary information (title, date, duration, host).
 */
export function MeetingRow({ meeting: initialMeeting, checked, onToggle }: MeetingRowProps) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  
  const organizer = meeting.participants.find(p => p.is_current_user) || meeting.participants[0];
  const hostName = organizer ? organizer.name : "Unknown Host";
  
  const formattedDate = formatMeetingDateShort(meeting.meeting_date);
  const minutes = formatMsToMinutes(meeting.duration_ms);
  
  // Opacity styles based on processing status
  const rowOpacity = meeting.status === "processing" ? "opacity-50" : "opacity-100";
  
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleActionClick = (e: React.MouseEvent, action: string) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen(false);
    if (action === "Edit") {
      setShowEditModal(true);
    } else {
      addToast({ type: "info", title: `${action} is not functional yet` });
    }
  };
  
  return (
    <div 
      className={`group flex items-center justify-between p-4 max-w-[789px] h-[78px] bg-white border border-[var(--color-gray-100)] rounded-[12px] transition-colors hover:bg-[var(--color-gray-50)] text-[var(--color-gray-900)] ${rowOpacity} relative`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMenuOpen(false); }}
    >
      <div className="flex items-center gap-4 h-full">
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center relative">
          {(isHovered || checked) ? (
            <div className="absolute inset-0 flex items-center justify-center">
               <Checkbox checked={checked} onChange={(e) => onToggle(e.target.checked)} />
            </div>
          ) : meeting.title.trim().length > 0 && /^[A-Za-z]/.test(meeting.title) ? (
            <div className="w-10 h-10 bg-[#FFC53D] rounded-lg flex items-center justify-center text-white font-medium text-[18px]">
              {meeting.title.trim().charAt(0).toUpperCase()}
            </div>
          ) : (
            <div className="w-10 h-10 bg-[var(--color-gray-200)] rounded-lg flex items-center justify-center text-[var(--color-gray-400)]">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
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
      <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered || menuOpen ? "opacity-100" : "opacity-0"}`}>
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded text-[var(--color-gray-500)] hover:bg-[var(--color-gray-200)] flex items-center justify-center outline-none"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
          </button>
          
          {menuOpen && (
            <div className="absolute top-full right-0 mt-1 w-32 bg-white rounded-md shadow-[var(--shadow-modal)] border border-[var(--color-gray-200)] py-1 z-10 text-[14px] text-[var(--color-gray-700)]">
              <button onClick={(e) => handleActionClick(e, "Copy")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Copy</button>
              <button onClick={(e) => handleActionClick(e, "Share")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Share</button>
              <button onClick={(e) => handleActionClick(e, "Download")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Download</button>
              <button onClick={(e) => handleActionClick(e, "Edit")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Edit</button>
            </div>
          )}
        </div>
        <button 
          onClick={() => setShowDetailsModal(true)}
          className="px-3 py-1.5 rounded text-[14px] font-medium text-[var(--color-gray-700)] bg-white border border-[var(--color-gray-200)] shadow-sm hover:bg-[var(--color-gray-50)]"
        >
          Details ›
        </button>
      </div>

      {showEditModal && (
        <EditMeetingModal
          meetingId={meeting.id}
          initialTitle={meeting.title}
          onClose={() => setShowEditModal(false)}
          onSuccess={(newTitle) => setMeeting({ ...meeting, title: newTitle })}
        />
      )}
      
      {showDetailsModal && (
        <MeetingDetailsModal
          meeting={meeting}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
}
