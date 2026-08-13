// Ask a question across every meeting. Answers carry citations that seek.
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { api } from "@/lib/api";
import { formatMs } from "@/lib/time";
import { QueryResponse } from "@/lib/types";

export function AskPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (question.trim().length < 3) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api.askQuestion(question.trim()));
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // The notepad reads ?t= on mount and seeks there, so a citation lands the user
  // on the exact line rather than at the top of the meeting.
  const openCitation = (meetingId: number, startMs: number) => {
    onClose();
    router.push(`/notebook/${meetingId}?t=${startMs}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ask across your meetings">
      <div className="flex flex-col gap-4 min-w-[520px]">
        <div className="flex gap-2">
          <Input
            autoFocus
            value={question}
            placeholder="What did we decide about the launch date?"
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
          />
          <Button onClick={ask} disabled={loading || question.trim().length < 3}>
            {loading ? "Asking…" : "Ask"}
          </Button>
        </div>

        {error && <p className="text-[14px] text-[var(--color-pink-700)]">{error}</p>}

        {result && (
          <div>
            <p className="text-[14px] leading-[22px] text-[var(--color-gray-900)]">
              {result.answer}
            </p>

            {result.citations.length > 0 && (
              <div className="mt-5">
                <h4 className="text-[12px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-2">
                  Sources
                </h4>
                <ul className="flex flex-col gap-2 max-h-64 overflow-auto">
                  {result.citations.map((c, i) => (
                    <li key={`${c.meeting_id}-${c.start_ms}-${i}`}>
                      <button
                        onClick={() => openCitation(c.meeting_id, c.start_ms)}
                        className="w-full text-left px-3 py-2 rounded-[8px] border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)] outline-none"
                      >
                        <span className="flex items-center gap-2 text-[12px] text-[var(--color-gray-500)]">
                          <span className="truncate">{c.meeting_title}</span>
                          <span className="text-[var(--color-blue-700)] underline flex-shrink-0">
                            {formatMs(c.start_ms)}
                          </span>
                        </span>
                        <span className="block mt-1 text-[14px] text-[var(--color-gray-700)] line-clamp-2">
                          {c.speaker_label ? `${c.speaker_label}: ` : ""}
                          {c.text}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Be explicit about which engine answered — "keyword" is not an LLM. */}
            <p className="mt-4 text-[12px] text-[var(--color-gray-400)]">
              {result.answered_by === "keyword"
                ? "Answered by keyword search — no language model is configured."
                : `Answered by ${result.answered_by}.`}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
