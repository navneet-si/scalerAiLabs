import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { api } from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useRouter } from "next/navigation";

export function CreateSeedModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const handleCreate = async () => {
    setLoading(true);
    
    try {
      const res = await api.createMeeting({
        title: title || "New Seeded Meeting",
        generate_summary: true
      });
      addToast({ type: "success", title: "Meeting created successfully" });
      onClose();
      // Wait a moment for generation
      setTimeout(() => {
        router.push(`/notebook/${res.id}`);
      }, 500);
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Creation failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Seeded Meeting">
      <div className="flex flex-col gap-4">
        <p className="text-[14px] text-[var(--color-gray-500)]">
          This will generate a fake transcript and summarize it using the backend LLM logic.
        </p>
        
        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Title
          </label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="E.g. Q3 Roadmap Review" 
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
