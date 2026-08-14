"use client";

import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { MeetingDetail, TranscriptRead } from "@/lib/types";
import { LoadingState } from "@/components/ui/Loading";
import { TranscriptPanel } from "@/components/notepad/TranscriptPanel";
import { PlayerBar } from "@/components/notepad/PlayerBar";
import { NotesDocument } from "@/components/notepad/NotesDocument";
import { EditMeetingModal } from "@/components/notepad/EditMeetingModal";
import { DeleteMeetingModal } from "@/components/notepad/DeleteMeetingModal";
import { useMediaSync } from "@/lib/useMediaSync";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const meetingId = parseInt(params.id as string, 10);
  // A citation from the Ask panel arrives as ?t=<ms>; seek there once the
  // transcript is in hand so the cited line is already highlighted on arrival.
  const seekToParam = Number(searchParams.get("t"));
  
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    // A non-numeric id can never resolve. Returning here used to leave the page
    // spinning on the loading state forever.
    if (isNaN(meetingId)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    Promise.all([
      api.getMeeting(meetingId),
      api.getTranscript(meetingId).catch(() => null)
    ])
      .then(([mRes, tRes]) => {
        setMeeting(mRes);
        setTranscript(tRes);
      })
      .catch((e) => {
        console.error(e);
        // A 404 is a missing meeting, not a broken app — they get different screens.
        if (e?.status === 404) setNotFound(true);
        else setError("We couldn't load this meeting. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, [meetingId]);

  const {
    currentTimeMs,
    playing,
    play,
    pause,
    seek,
    rate,
    setRate
  } = useMediaSync(meeting?.duration_ms || 0, meeting?.audio_url || null);

  const seekedRef = React.useRef(false);

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
    
    if (action === "Rename") {
      setEditOpen(true);
    } else if (action === "Delete") {
      setDeleteOpen(true);
    } else {
      addToast({ type: "info", title: `${action} is not functional yet` });
    }
  };
  useEffect(() => {
    if (seekedRef.current || !transcript || !Number.isFinite(seekToParam) || seekToParam <= 0) return;
    seekedRef.current = true;
    seek(seekToParam);
  }, [transcript, seekToParam, seek]);

  const handleToggleActionItem = async (id: number, checked: boolean) => {
    if (!meeting) return;
    // Optimistic update
    setMeeting(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        action_items: prev.action_items.map(ai => ai.id === id ? { ...ai, is_done: checked } : ai)
      };
    });
    try {
      await api.updateActionItem(id, { is_done: checked });
    } catch (e) {
      console.error(e);
      // Revert on error
      setMeeting(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          action_items: prev.action_items.map(ai => ai.id === id ? { ...ai, is_done: !checked } : ai)
        };
      });
    }
  };

  const handleAddActionItem = async (text: string) => {
    if (!meeting) return;
    const tempId = -Date.now();
    const newItem = {
      id: tempId,
      meeting_id: meeting.id,
      text,
      is_done: false,
      due_date: null,
      position: meeting.action_items.length,
      assignee: null,
      source_segment_id: null
    };
    
    setMeeting(prev => prev ? { ...prev, action_items: [...prev.action_items, newItem] } : prev);
    
    try {
      const created = await api.createActionItem(meeting.id, { text });
      setMeeting(prev => prev ? { 
        ...prev, 
        action_items: prev.action_items.map(ai => ai.id === tempId ? created : ai) 
      } : prev);
    } catch(e) {
      console.error(e);
      setMeeting(prev => prev ? { 
        ...prev, 
        action_items: prev.action_items.filter(ai => ai.id !== tempId) 
      } : prev);
    }
  };

  const handleUpdateActionItem = async (id: number, data: any, optimisticData: any) => {
    if (!meeting) return;
    let oldItem: any = null;
    setMeeting(prev => {
      if (!prev) return prev;
      oldItem = prev.action_items.find(ai => ai.id === id);
      return {
        ...prev,
        action_items: prev.action_items.map(ai => ai.id === id ? { ...ai, ...optimisticData } : ai)
      };
    });
    
    try {
      const updated = await api.updateActionItem(id, data);
      setMeeting(prev => prev ? {
        ...prev,
        action_items: prev.action_items.map(ai => ai.id === id ? updated : ai)
      } : prev);
    } catch(e) {
      console.error(e);
      if (oldItem) {
        setMeeting(prev => prev ? {
          ...prev,
          action_items: prev.action_items.map(ai => ai.id === id ? oldItem : ai)
        } : prev);
      }
    }
  };

  const handleDeleteActionItem = async (id: number) => {
    if (!meeting) return;
    let oldItem: any = null;
    setMeeting(prev => {
      if (!prev) return prev;
      oldItem = prev.action_items.find(ai => ai.id === id);
      return {
        ...prev,
        action_items: prev.action_items.filter(ai => ai.id !== id)
      };
    });
    
    try {
      await api.deleteActionItem(id);
    } catch(e) {
      console.error(e);
      if (oldItem) {
        setMeeting(prev => prev ? {
          ...prev,
          action_items: [...prev.action_items, oldItem]
        } : prev);
      }
    }
  };

  if (loading) return <LoadingState />;

  if (notFound || error || !meeting) {
    const isMissing = notFound || !meeting;
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <svg
          width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-[var(--color-gray-400)] mb-4"
        >
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>

        <h2 className="text-[18px] font-medium text-[var(--color-gray-900)] mb-2">
          {isMissing ? "This meeting doesn't exist" : "Something went wrong"}
        </h2>

        <p className="text-[14px] text-[var(--color-gray-500)] mb-6 max-w-[380px]">
          {isMissing
            ? "It may have been deleted, or the link is wrong."
            : error}
        </p>

        <Link href="/notebook">
          <Button variant="secondary">Back to meetings</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Breadcrumb bar — 52px, matching the shell's top bar height. */}
      <div className="h-[52px] flex items-center justify-between px-6 border-b border-[var(--color-gray-200)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 text-[14px]">
          <Link href="/notebook" className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]">
            My Meetings
          </Link>
          <span className="text-[var(--color-gray-400)]">/</span>
          <span className="text-[var(--color-gray-900)] truncate max-w-[400px]">{meeting.title}</span>
          
          <div className="relative ml-1" ref={menuRef}>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-7 h-7 rounded text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] flex items-center justify-center outline-none"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
            </button>
            
            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-[var(--shadow-modal)] border border-[var(--color-gray-200)] py-1 z-50 text-[14px] text-[var(--color-gray-700)]">
                <button onClick={(e) => handleActionClick(e, "Share")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Share</button>
                <button onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  navigator.clipboard.writeText(window.location.href);
                  addToast({ type: "success", title: "Link copied to clipboard" });
                }} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Copy Link</button>
                <div className="my-1 border-t border-[var(--color-gray-200)]"></div>
                <button onClick={(e) => handleActionClick(e, "Regenerate notes")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none flex items-center gap-2">
                  Regenerate notes
                  <span className="text-[10px] font-semibold text-[var(--color-purple-700)] bg-[var(--color-purple-50)] px-1.5 py-0.5 rounded">New</span>
                </button>
                <button onClick={(e) => handleActionClick(e, "Rename")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Rename</button>
                <button onClick={(e) => handleActionClick(e, "Update Language")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Update Language</button>
                <button onClick={(e) => handleActionClick(e, "Meeting Info")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Meeting Info</button>
                <button onClick={(e) => handleActionClick(e, "Download")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Download</button>
                <div className="my-1 border-t border-[var(--color-gray-200)]"></div>
                <button onClick={(e) => handleActionClick(e, "Delete")} className="w-full text-left px-4 py-2 hover:bg-[var(--color-gray-50)] outline-none">Delete</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {/* Header actions can go here if needed, but Edit and Delete moved to dropdown */}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Notes panel — the primary surface. The player is pinned to the bottom
            of this column only, not across the transcript, which is where the
            reference product puts it. */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div className="flex-1 overflow-auto pb-24">
              <NotesDocument
                meeting={meeting}
                summary={meeting.summary}
                chapters={meeting.chapters}
                actionItems={meeting.action_items}
                onSeek={seek}
                onToggleActionItem={handleToggleActionItem}
                onAddActionItem={handleAddActionItem}
                onUpdateActionItem={handleUpdateActionItem}
                onDeleteActionItem={handleDeleteActionItem}
              />
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-40">
            <PlayerBar
              currentTimeMs={currentTimeMs}
              durationMs={meeting.duration_ms}
              playing={playing}
              rate={rate}
              onPlay={play}
              onPause={pause}
              onSeek={seek}
              onRateChange={setRate}
            />
          </div>
        </div>

        {/* Transcript — fixed 630px, as measured. */}
        <div className="w-[630px] flex-shrink-0 flex flex-col">
          {meeting.status === "processing" ? (
             <div className="flex-1 flex items-center justify-center text-[14px] text-[var(--color-gray-500)] border-l border-[var(--color-gray-200)]">
               Processing transcript…
             </div>
          ) : !transcript || transcript.segments.length === 0 ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center px-8 border-l border-[var(--color-gray-200)]">
               <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-2">No transcript</h3>
               <p className="text-[14px] text-[var(--color-gray-500)] max-w-xs">
                 This meeting was created without one. Upload a file or paste a transcript to
                 generate notes.
               </p>
             </div>
          ) : (
            <TranscriptPanel
              transcript={transcript}
              currentTimeMs={currentTimeMs}
              playing={playing}
              onSeek={seek}
            />
          )}
        </div>
      </div>

      <EditMeetingModal 
        isOpen={editOpen} 
        onClose={() => setEditOpen(false)} 
        meeting={meeting} 
        onUpdate={setMeeting} 
      />
      
      <DeleteMeetingModal 
        isOpen={deleteOpen} 
        onClose={() => setDeleteOpen(false)} 
        meetingId={meeting.id} 
      />
    </div>
  );
}
