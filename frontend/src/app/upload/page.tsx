"use client";

import React, { useState, useEffect } from "react";
import { Dropzone } from "@/components/upload/Dropzone";
import { UploadDialog } from "@/components/upload/UploadDialog";
import { UploadRow } from "@/components/upload/UploadRow";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { MeetingListItem } from "@/lib/types";

export default function UploadPage() {
  const [showBanner, setShowBanner] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [uploads, setUploads] = useState<MeetingListItem[]>([]);
  const [fetchingUploads, setFetchingUploads] = useState(true);

  const { addToast } = useToast();

  const fetchUploads = async () => {
    try {
      setFetchingUploads(true);
      const res = await api.getMeetings({ limit: 100 });
      // The backend doesn't have a source filter, so filter client-side
      const filtered = res.items.filter(m => m.source === "upload");
      setUploads(filtered);
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingUploads(false);
    }
  };

  useEffect(() => {
    fetchUploads();
  }, []);

  const handleUpload = async (title: string, generateSummary: boolean) => {
    if (!file) return;

    // There is no transcription step in this app — the backend parses .vtt, .json
    // and .txt only. Say so rather than inventing a transcript the user never gave us.
    if (
      file.type.startsWith("audio/") ||
      file.type.startsWith("video/") ||
      /\.(mp3|m4a|wav|mp4|webm|mov|aac|flac)$/i.test(file.name)
    ) {
      setError(
        "Audio and video files aren't transcribed. Upload a .vtt, .json or .txt transcript instead.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title || file.name);
      formData.append("generate_summary", generateSummary ? "true" : "false");

      await api.uploadMeeting(formData);
      addToast({ type: "success", title: "Meeting uploaded successfully" });

      // Close dialog and refresh list
      setFile(null);
      fetchUploads();

    } catch (e: any) {
      console.error(e);
      // A 422 is a problem with this file, so it belongs next to the file —
      // keep the dialog open instead of dropping a toast and discarding context.
      if (e.status === 422 && e.data?.detail) {
        let msg = "That file could not be parsed as a transcript.";
        if (Array.isArray(e.data.detail)) {
          msg = e.data.detail[0]?.msg || msg;
        } else if (typeof e.data.detail === "string") {
          msg = e.data.detail;
        }
        setError(msg);
      } else {
        setError("Upload failed. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white relative">
      {/* Banner */}
      {showBanner && (
        <div className="flex items-center justify-center p-3 bg-[#FFF9E6] border-b border-[var(--color-gray-200)] relative">
          <p className="text-[14px] text-[#B54708]">
            <span className="font-semibold">Uploads are moving</span> — you'll find them on the Meetings page soon.
          </p>
          <button 
            onClick={() => setShowBanner(false)}
            className="absolute right-4 text-[#B54708] hover:text-[#933706] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col items-center flex-1 max-w-4xl mx-auto w-full pt-16 px-6">
        
        {/* Upload Area */}
        <div className="w-full mb-12">
          <Dropzone onFileSelect={(selectedFile) => {
            setError(null);
            setFile(selectedFile);
          }} />
        </div>

        {/* Uploads List or Empty State */}
        <div className="w-full max-w-[789px] flex flex-col gap-3 pb-20">
          {!fetchingUploads && uploads.length === 0 ? (
            <div className="flex flex-col items-center justify-center opacity-60 mt-8">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-gray-400)] mb-4">
                <path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5" />
                <path d="M4 12h16v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7z" />
                <path d="M9 12v3h6v-3" />
              </svg>
              <h2 className="text-[18px] font-semibold text-[var(--color-gray-900)]">You have no recent uploads!</h2>
            </div>
          ) : (
            uploads.map(meeting => (
              <UploadRow key={meeting.id} meeting={meeting} />
            ))
          )}
        </div>
      </div>

      {file && (
        <UploadDialog
          file={file}
          onClose={() => { setFile(null); setError(null); }}
          onUpload={handleUpload}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
