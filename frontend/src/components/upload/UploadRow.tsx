import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { MeetingListItem } from "@/lib/types";
import { formatMsToMinutes } from "@/lib/time";
import { useToast } from "../ui/Toast";
import { EditMeetingModal } from "../library/EditMeetingModal";
import { MeetingDetailsModal } from "../library/MeetingDetailsModal";

type UploadRowProps = {
  meeting: MeetingListItem;
};

function formatUploadDate(isoDate: string) {
  const d = new Date(isoDate);
  const mmm = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  return `${mmm} ${day}`;
}

export function UploadRow({ meeting: initialMeeting }: UploadRowProps) {
  const [meeting, setMeeting] = useState(initialMeeting);
  const [isHovered, setIsHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  
  const formattedDate = formatUploadDate(meeting.meeting_date);
  const minutes = formatMsToMinutes(meeting.duration_ms);
  
  // Since the API doesn't store file size for uploads, we estimate it or just use the duration
  // Actually, we'll just show the duration as in the M4A/WAV examples
  const ext = meeting.title.split('.').pop()?.toUpperCase().substring(0, 3) || "FILE";
  const sizeEstimate = meeting.duration_ms > 0 ? `${(meeting.duration_ms / 60000).toFixed(1)} MB` : "Unknown Size";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
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
      className="group flex items-center justify-between p-4 max-w-[789px] h-[78px] bg-white border border-[var(--color-gray-100)] rounded-[12px] transition-colors hover:bg-[var(--color-gray-50)] text-[var(--color-gray-900)] relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setMenuOpen(false); }}
    >
      <div className="flex items-center gap-4 h-full">
        {/* Blue file type icon */}
        <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-[#2D8CFF] text-white rounded-md text-[10px] font-bold">
          {ext}
        </div>
        
        <div className="flex flex-col justify-center">
          <Link href={`/notebook/${meeting.id}`} className="text-[14px] font-medium leading-tight hover:text-[var(--color-purple-700)] text-[var(--color-gray-900)] flex items-center gap-1">
            {meeting.title}
          </Link>
          <div className="text-[12px] text-[var(--color-gray-500)] leading-tight mt-1">
            {formattedDate} · {minutes > 0 ? `${minutes} min` : sizeEstimate}
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
