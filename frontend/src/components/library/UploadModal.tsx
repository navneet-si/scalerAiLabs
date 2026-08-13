import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { api } from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useRouter } from "next/navigation";

export function UploadModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const router = useRouter();

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("audio_file", file);
      formData.append("title", title || file.name);
      formData.append("generate_summary", "true");
      
      const res = await api.uploadMeeting(formData);
      addToast({ type: "success", title: "Meeting uploaded successfully" });
      onClose();
      // Redirect to the new meeting
      router.push(`/notebook/${res.id}`);
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Upload failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Audio/Video">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            File
          </label>
          <input 
            type="file" 
            accept="audio/*,video/*"
            className="w-full text-[14px] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[var(--color-purple-50)] file:text-[var(--color-purple-700)] hover:file:bg-[var(--color-purple-100)]"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        
        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Title (optional)
          </label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Enter meeting title..." 
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleUpload} disabled={!file || loading}>
            {loading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
