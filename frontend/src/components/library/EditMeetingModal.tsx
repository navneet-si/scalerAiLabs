import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

type EditMeetingModalProps = {
  meetingId: number;
  initialTitle: string;
  onClose: () => void;
  onSuccess: (newTitle: string) => void;
};

export function EditMeetingModal({ meetingId, initialTitle, onClose, onSuccess }: EditMeetingModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const handleSave = async () => {
    if (!title.trim()) {
      addToast({ type: "error", title: "Title cannot be empty" });
      return;
    }
    
    if (title === initialTitle) {
      onClose();
      return;
    }

    setLoading(true);
    try {
      await api.updateMeeting(meetingId, { title });
      addToast({ type: "success", title: "Meeting title updated" });
      onSuccess(title);
      onClose();
    } catch (e: any) {
      console.error(e);
      addToast({ type: "error", title: "Failed to update meeting title" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl relative border border-[var(--color-gray-200)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold text-[var(--color-gray-900)]">Edit Meeting</h2>
          <button onClick={onClose} disabled={loading} className="text-[var(--color-gray-400)] hover:text-[var(--color-gray-500)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">Title</label>
          <input 
            type="text" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border border-[var(--color-gray-300)] rounded-md px-3 py-2 text-[14px] outline-none focus:border-[var(--color-purple-500)] focus:ring-1 focus:ring-[var(--color-purple-500)]"
            autoFocus
          />
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-[var(--color-purple-600)] text-white hover:bg-[var(--color-purple-700)]">
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );
}
