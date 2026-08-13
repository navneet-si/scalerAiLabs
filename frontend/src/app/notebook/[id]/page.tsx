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

export default function MeetingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const meetingId = parseInt(params.id as string, 10);
  // A citation from the Ask panel arrives as ?t=<ms>; seek there once the
  // transcript is in hand so the cited line is already highlighted on arrival.
  const seekToParam = Number(searchParams.get("t"));
  
  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [transcript, setTranscript] = useState<TranscriptRead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (isNaN(meetingId)) return;
    
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
        setError("Failed to load meeting.");
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

  if (loading) return <LoadingState />;
  if (error || !meeting) return <div className="p-8 text-[var(--color-red-600)]">{error || "Not found"}</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* Breadcrumb bar — 52px, matching the shell's top bar height. */}
      <div className="h-[52px] flex items-center justify-between px-6 border-b border-[var(--color-gray-200)] flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 text-[14px]">
          <Link href="/notebook" className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]">
            My Meetings
          </Link>
          <span className="text-[var(--color-gray-400)]">/</span>
          <span className="text-[var(--color-gray-900)] truncate">{meeting.title}</span>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
          <Button variant="secondary" onClick={() => setDeleteOpen(true)}>Delete</Button>
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
