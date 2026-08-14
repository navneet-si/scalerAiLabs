import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Button } from "../ui/Button";
import { api } from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useRouter } from "next/navigation";

export function DeleteMeetingModal({ 
  isOpen, 
  onClose, 
  meetingId 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  meetingId: number;
}) {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    setLoading(true);
    
    try {
      await api.deleteMeeting(meetingId);
      addToast({ type: "success", title: "Meeting deleted successfully" });
      onClose();
      router.push("/notebook");
      router.refresh(); // Ensure the library re-fetches and the row is gone
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Delete failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Meeting" width={400}>
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-[var(--color-gray-700)]">
          Are you sure you want to delete this meeting? This action cannot be undone. 
          You will lose the transcript, summary, and all action items.
        </p>
        
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="ghost" className="text-[var(--color-gray-500)] bg-transparent border-transparent hover:bg-[var(--color-gray-100)]" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
