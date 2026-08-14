import React, { useState } from "react";
import { Button } from "@/components/ui/Button";

type UploadDialogProps = {
  file: File;
  onClose: () => void;
  onUpload: (title: string, generateSummary: boolean) => void;
  loading: boolean;
  error?: string | null;
};

export function UploadDialog({ file, onClose, onUpload, loading, error }: UploadDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(file.name.replace(/\.[^/.]+$/, ""));
  
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }).toLowerCase();
  
  const ext = file.name.split('.').pop()?.toUpperCase() || "FILE";

  const handleUploadClick = () => {
    onUpload(title, true);
  };

  return (
    <div className="fixed bottom-6 right-6 w-[400px] bg-white rounded-[16px] shadow-[var(--shadow-modal)] z-[1000] overflow-hidden border border-[var(--color-gray-200)] flex flex-col font-sans">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-gray-200)]">
        <h3 className="text-[16px] font-semibold text-[var(--color-gray-900)]">Uploading 1 Files</h3>
        <button onClick={onClose} disabled={loading} className="text-[var(--color-gray-400)] hover:text-[var(--color-gray-500)]">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      
      <div className="p-5 flex flex-col gap-4">
        {/* Language dropdown (disabled) */}
        <div className="relative">
          <select 
            disabled 
            className="w-full appearance-none bg-white border border-[var(--color-purple-500)] text-[var(--color-purple-700)] rounded-md px-3 py-2 text-[14px] font-medium opacity-100"
          >
            <option>English (Global)</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--color-purple-500)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </div>

        {/* File info */}
        <div className="flex items-center gap-3 mt-2">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 bg-[#2D8CFF] text-white rounded-md text-[10px] font-bold shrink-0">
            {ext}
          </div>
          
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setIsEditing(false)}
                onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
                autoFocus
                className="w-full border border-[var(--color-gray-300)] rounded px-2 py-1 text-[14px] text-[var(--color-gray-900)] outline-none focus:border-[var(--color-purple-500)] focus:ring-1 focus:ring-[var(--color-purple-500)]"
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <p className="text-[14px] font-medium text-[var(--color-gray-900)] truncate">{title}</p>
                  <p className="text-[12px] text-[var(--color-gray-500)]">
                    {dateStr} {timeStr}
                  </p>
                </div>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-[12px] font-medium text-[var(--color-purple-700)] hover:text-[var(--color-purple-800)] ml-2"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
          
          {!isEditing && (
             <button onClick={onClose} disabled={loading} className="text-[var(--color-gray-400)] hover:text-[var(--color-gray-500)] self-start mt-1">
               <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <line x1="18" y1="6" x2="6" y2="18" />
                 <line x1="6" y1="6" x2="18" y2="18" />
               </svg>
             </button>
          )}
        </div>
        
        {error && (
          <p className="text-[13px] leading-relaxed text-[var(--color-pink-700)] bg-[#FEF3F2] border border-[#FECDCA] rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end mt-2">
          <Button onClick={handleUploadClick} disabled={loading} className="px-6 flex items-center gap-2 text-[14px] bg-[var(--color-purple-600)] text-white">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </div>
  );
}
