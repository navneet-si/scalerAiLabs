// Edit a meeting's metadata: title, description, date, participants and tags.
import React, { useState, useEffect } from "react";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { api } from "@/lib/api";
import { useToast } from "../ui/Toast";
import { MeetingDetail, ParticipantRead } from "@/lib/types";

// <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time, while the
// API speaks ISO-8601. These two convert across that boundary in one place.
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function EditMeetingModal({
  isOpen,
  onClose,
  meeting,
  onUpdate,
}: {
  isOpen: boolean;
  onClose: () => void;
  meeting: MeetingDetail;
  onUpdate: (m: MeetingDetail) => void;
}) {
  const [title, setTitle] = useState(meeting.title);
  const [description, setDescription] = useState(meeting.description || "");
  const [meetingDate, setMeetingDate] = useState(toLocalInput(meeting.meeting_date));
  const [tags, setTags] = useState(meeting.tags.map((t) => t.name).join(", "));
  const [participantIds, setParticipantIds] = useState<number[]>(meeting.participants.map((p) => p.id));
  const [allParticipants, setAllParticipants] = useState<ParticipantRead[]>([]);
  const [loading, setLoading] = useState(false);
  const [titleError, setTitleError] = useState<string | null>(null);
  const { addToast } = useToast();

  useEffect(() => {
    if (!isOpen) return;
    setTitle(meeting.title);
    setDescription(meeting.description || "");
    setMeetingDate(toLocalInput(meeting.meeting_date));
    setTags(meeting.tags.map((t) => t.name).join(", "));
    setParticipantIds(meeting.participants.map((p) => p.id));
    setTitleError(null);
  }, [meeting, isOpen]);

  // The API takes participant IDs on PATCH, not {name,email} objects the way POST
  // does, so the picker has to be backed by the existing directory.
  useEffect(() => {
    if (!isOpen || allParticipants.length > 0) return;
    api.getParticipants().then(setAllParticipants).catch(() => {
      addToast({ type: "error", title: "Could not load participants" });
    });
  }, [isOpen, allParticipants.length, addToast]);

  const toggleParticipant = (id: number) => {
    setParticipantIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }
    setLoading(true);
    setTitleError(null);

    try {
      const res = await api.updateMeeting(meeting.id, {
        title: title.trim(),
        description: description || null,
        meeting_date: fromLocalInput(meetingDate),
        // Both lists replace the existing set wholesale — that is the API's
        // semantics, not a shortcut here.
        participant_ids: participantIds,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      addToast({ type: "success", title: "Meeting updated" });
      onUpdate(res);
      onClose();
    } catch (e) {
      // 422 carries per-field detail; surface the title case inline since it is
      // the only field the server can reject on its own.
      const detail = (e as { data?: { detail?: { loc?: string[]; msg?: string }[] } })?.data?.detail;
      const fieldError = Array.isArray(detail)
        ? detail.find((d) => d.loc?.includes("title"))
        : undefined;
      if (fieldError?.msg) {
        setTitleError(fieldError.msg);
      } else {
        addToast({ type: "error", title: "Update failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Meeting Details">
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">Title</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          {titleError && (
            <p className="mt-1 text-[12px] text-[var(--color-pink-700)]">{titleError}</p>
          )}
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">Description</label>
          <textarea
            className="w-full text-[14px] px-3 py-2 border border-[var(--color-gray-300)] rounded-md outline-none focus:border-[var(--color-purple-500)] focus:ring-1 focus:ring-[var(--color-purple-500)] resize-none"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">Date &amp; time</label>
          <Input type="datetime-local" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
            Tags <span className="text-[var(--color-gray-500)] font-normal">(comma separated)</span>
          </label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Leadership, Board" />
        </div>

        <div>
          <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">Participants</label>
          <div className="max-h-40 overflow-auto border border-[var(--color-gray-200)] rounded-md divide-y divide-[var(--color-gray-200)]">
            {allParticipants.length === 0 && (
              <p className="px-3 py-2 text-[14px] text-[var(--color-gray-500)]">Loading…</p>
            )}
            {allParticipants.map((p) => (
              <label key={p.id} className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--color-gray-50)]">
                <Checkbox
                  checked={participantIds.includes(p.id)}
                  onChange={() => toggleParticipant(p.id)}
                />
                <span className="text-[14px] text-[var(--color-gray-700)]">{p.name}</span>
                {p.email && <span className="text-[12px] text-[var(--color-gray-500)]">{p.email}</span>}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
