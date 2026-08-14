import React, { useState } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { api } from "@/lib/api";
import { useToast } from "../ui/Toast";
import { useRouter } from "next/navigation";

export function CreateMeetingModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [participants, setParticipants] = useState<{ name: string; email: string }[]>([]);
  const [tags, setTags] = useState("");
  const [transcriptText, setTranscriptText] = useState("");
  const [generateSummary, setGenerateSummary] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any[]>([]);
  
  const { addToast } = useToast();
  const router = useRouter();

  const handleAddParticipant = () => setParticipants([...participants, { name: "", email: "" }]);
  const handleRemoveParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };
  const updateParticipant = (index: number, field: "name" | "email", val: string) => {
    const next = [...participants];
    next[index][field] = val;
    setParticipants(next);
  };

  const handleCreate = async () => {
    setLoading(true);
    setErrorDetails([]);
    
    const parsedTags = tags.split(",").map(t => t.trim()).filter(t => t);
    const validParticipants = participants.filter(p => p.name.trim() !== "");

    try {
      const res = await api.createMeeting({
        title,
        description: description || undefined,
        meeting_date: meetingDate ? new Date(meetingDate).toISOString() : undefined,
        participants: validParticipants.length > 0 ? validParticipants : undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        transcript_text: transcriptText || undefined,
        generate_summary: generateSummary
      });
      addToast({ type: "success", title: "Meeting created successfully" });
      onClose();
      // Wait a moment for generation
      setTimeout(() => {
        router.push(`/notebook/${res.id}`);
      }, 500);
    } catch (e: any) {
      console.error(e);
      if (e.status === 422 && e.data?.detail) {
         setErrorDetails(e.data.detail);
      } else {
         addToast({ type: "error", title: "Creation failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (fieldName: string) => {
     return errorDetails.find(d => {
       const loc = d.loc;
       return Array.isArray(loc) && loc.includes(fieldName);
     })?.msg;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Meeting">
      <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto p-1">
        
        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Title *
          </label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="E.g. Q3 Roadmap Review" 
          />
          {getFieldError("title") && <p className="text-red-500 text-xs mt-1">{getFieldError("title")}</p>}
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Description
          </label>
          <Input 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="Optional description" 
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Meeting Date
          </label>
          <input 
            type="datetime-local"
            className="w-full text-[14px] h-9 px-3 border border-[var(--color-gray-200)] rounded-md focus:outline-none focus:border-[var(--color-purple-500)] focus:ring-1 focus:ring-[var(--color-purple-500)] placeholder:text-[var(--color-gray-400)] transition-colors"
            value={meetingDate} 
            onChange={(e) => setMeetingDate(e.target.value)} 
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Participants
          </label>
          <div className="flex flex-col gap-2 mb-2">
             {participants.map((p, i) => (
                <div key={i} className="flex gap-2 items-center">
                   <Input placeholder="Name" value={p.name} onChange={(e) => updateParticipant(i, "name", e.target.value)} />
                   <Input placeholder="Email (optional)" value={p.email} onChange={(e) => updateParticipant(i, "email", e.target.value)} />
                   <button onClick={() => handleRemoveParticipant(i)} className="text-[var(--color-gray-400)] hover:text-red-500 text-lg px-2 flex-shrink-0">&times;</button>
                </div>
             ))}
          </div>
          <Button variant="secondary" size="sm" onClick={handleAddParticipant}>+ Add Participant</Button>
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Tags (comma separated)
          </label>
          <Input 
            value={tags} 
            onChange={(e) => setTags(e.target.value)} 
            placeholder="engineering, product, Q3" 
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Transcript Text or WebVTT
          </label>
          <textarea 
            className="w-full h-32 text-[14px] p-3 border border-[var(--color-gray-200)] rounded-md focus:outline-none focus:border-[var(--color-purple-500)] focus:ring-1 focus:ring-[var(--color-purple-500)] placeholder:text-[var(--color-gray-400)] transition-colors resize-y"
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            placeholder="Paste transcript text here..."
          />
        </div>

        <div className="flex items-center mt-2">
          <Checkbox checked={generateSummary} onChange={(e) => setGenerateSummary(e.target.checked)} label="Generate summary" />
        </div>
        
        <div className="flex justify-end gap-3 mt-4 pt-2 border-t border-[var(--color-gray-200)] sticky bottom-0 bg-white">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleCreate} disabled={loading || !title}>
            {loading ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
