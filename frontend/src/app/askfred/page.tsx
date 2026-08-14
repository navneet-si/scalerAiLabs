"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatMs } from "@/lib/time";
import { ParticipantRead, QueryResponse } from "@/lib/types";

export default function AskFredPage() {
  const router = useRouter();
  const [user, setUser] = useState<ParticipantRead | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getMe().then(setUser).catch(console.error);
  }, []);

  const ask = async (raw?: string) => {
    const q = (raw ?? question).trim();
    if (q.length < 3 || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setAsked(q);
    setQuestion("");

    try {
      setResult(await api.askQuestion(q));
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const newChat = () => {
    setAsked(null);
    setResult(null);
    setError(null);
    setQuestion("");
  };

  // The notepad reads ?t= on mount and seeks there, so a citation lands on the
  // exact line rather than at the top of the meeting.
  const openCitation = (meetingId: number, startMs: number) =>
    router.push(`/notebook/${meetingId}?t=${startMs}`);

  const hasConversation = asked !== null;

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {/* Secondary Sidebar */}
      <div className="w-[240px] flex-shrink-0 border-r border-[var(--color-gray-200)] flex flex-col bg-white">
        <div className="h-[60px] flex items-center px-6 border-b border-[var(--color-gray-100)] flex-shrink-0">
          <span className="font-medium text-[15px] text-[var(--color-gray-900)]">AskFred</span>
        </div>
        
        <div className="p-4 flex flex-col gap-2 border-b border-[var(--color-gray-100)]">
          <button
            onClick={newChat}
            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-700)] transition-colors text-left font-medium"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            New Chat
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-700)] transition-colors text-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            Search
          </button>
          <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-700)] transition-colors text-left">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
            Connectors
          </button>
        </div>

        <div className="flex-1 overflow-auto py-4">
          <h3 className="px-6 mb-3 text-[12px] font-medium text-[var(--color-gray-500)]">Recents</h3>
          
          <div className="mb-4">
            <p className="px-6 mb-2 text-[11px] font-medium text-[var(--color-gray-400)] uppercase tracking-wider">Today</p>
            <div className="flex flex-col">
              <button className="px-6 py-2 text-[13px] text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] text-left truncate w-full transition-colors">
                Discussion on Action Items
              </button>
            </div>
          </div>
          
          <div>
            <p className="px-6 mb-2 text-[11px] font-medium text-[var(--color-gray-400)] uppercase tracking-wider">Yesterday</p>
            <div className="flex flex-col">
              <button className="px-6 py-2 text-[13px] text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] text-left truncate w-full transition-colors">
                Outline My Action Items
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full">
        <div className="flex-1 overflow-auto flex flex-col items-center pt-8 pb-32">
          
          {/* Banner */}
          <div className="w-full max-w-[700px] bg-[#F8F9FE] rounded-xl px-5 py-3.5 flex items-center justify-between border border-[#E9EDFA] mb-12 shadow-sm shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2 shrink-0">
                 <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-[var(--color-gray-200)] shadow-sm z-10">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
                 </div>
                 <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center border border-[var(--color-gray-200)] shadow-sm">
                   <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                 </div>
              </div>
              <p className="text-[14px] text-[var(--color-gray-700)]">
                <span className="font-semibold text-[var(--color-gray-900)]">Connect Slack and Gmail</span> — get answers with full context.
              </p>
            </div>
            <button className="text-[13px] font-medium text-[var(--color-purple-600)] flex items-center gap-1 hover:text-[var(--color-purple-700)] transition-colors shrink-0">
              Connect
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>

          {!hasConversation && (
            <h1 className="text-[22px] font-medium text-[var(--color-gray-900)] tracking-tight mb-8">
              Hi {user?.name?.split(" ")[0].toUpperCase() || "NAVNEET"}, how can I help today?
            </h1>
          )}

          {hasConversation && (
            <div className="w-full max-w-[700px] mb-8 shrink-0">
              <div className="flex justify-end mb-6">
                <p className="max-w-[80%] text-[15px] text-[var(--color-gray-900)] bg-[var(--color-gray-50)] border border-[var(--color-gray-200)] rounded-[16px] px-4 py-3">
                  {asked}
                </p>
              </div>

              {error && (
                <p className="text-[14px] text-[var(--color-pink-700)]">{error}</p>
              )}

              {loading && (
                <div className="flex flex-col gap-3 animate-pulse">
                  <div className="h-4 bg-[var(--color-gray-100)] rounded w-full"></div>
                  <div className="h-4 bg-[var(--color-gray-100)] rounded w-5/6"></div>
                  <div className="h-4 bg-[var(--color-gray-100)] rounded w-4/6"></div>
                </div>
              )}

              {result && (
                <div>
                  <p className="text-[15px] leading-relaxed text-[var(--color-gray-900)] whitespace-pre-wrap">
                    {result.answer}
                  </p>

                  {result.citations.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-[12px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-3">
                        Sources
                      </h4>
                      <ul className="flex flex-col gap-3">
                        {result.citations.map((c, i) => (
                          <li key={`${c.meeting_id}-${c.start_ms}-${i}`}>
                            <button
                              onClick={() => openCitation(c.meeting_id, c.start_ms)}
                              className="w-full text-left p-4 rounded-[8px] border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)] transition-colors outline-none"
                            >
                              <span className="flex items-center gap-3 text-[13px] font-medium text-[var(--color-gray-900)] mb-1.5">
                                <span className="truncate">{c.meeting_title}</span>
                                <span className="text-[var(--color-blue-700)] underline flex-shrink-0">
                                  {formatMs(c.start_ms)}
                                </span>
                              </span>
                              <span className="block text-[14px] leading-relaxed text-[var(--color-gray-700)] line-clamp-2">
                                {c.speaker_label ? (
                                  <span className="font-medium mr-1.5 text-[var(--color-gray-900)]">
                                    {c.speaker_label}:
                                  </span>
                                ) : ""}
                                {c.text}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="mt-5 text-[12px] text-[var(--color-gray-400)]">
                    {/* The backend reports the engine it actually used, e.g.
                        "groq:llama-3.3-70b-versatile" or "keyword" on fallback. */}
                    {result.answered_by === "keyword"
                      ? "keyword search"
                      : result.answered_by.replace(":", " · ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Large Input Area */}
          <div className="w-full max-w-[700px] mb-8 shrink-0">
            <div className="relative rounded-[16px] border border-[var(--color-purple-300)] bg-white shadow-sm focus-within:ring-2 focus-within:ring-[var(--color-purple-100)] focus-within:border-[var(--color-purple-500)] transition-all flex flex-col">
              <textarea
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    ask();
                  }
                }}
                disabled={loading}
                placeholder="Ask anything about your meetings"
                className="w-full text-[15px] bg-transparent p-5 focus:outline-none resize-none placeholder:text-[var(--color-gray-400)] text-[var(--color-gray-900)] disabled:opacity-50"
              />
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors rounded-md hover:bg-[var(--color-gray-100)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </button>
                  <button className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors rounded-md hover:bg-[var(--color-gray-100)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                  </button>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[13px] text-[var(--color-gray-500)] cursor-pointer hover:text-[var(--color-gray-700)]">
                    Sonnet 5 (Auto)
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </div>
                  <button className="p-2 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors rounded-md hover:bg-[var(--color-gray-100)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                  </button>
                  <button
                    onClick={() => ask()}
                    aria-label="Ask"
                    disabled={loading || question.trim().length < 3}
                    className="p-2 bg-[var(--color-purple-200)] text-[var(--color-purple-600)] transition-colors rounded-md ml-1 shadow-sm disabled:opacity-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className={`w-full max-w-[700px] flex flex-col gap-1 shrink-0 ${hasConversation ? "hidden" : ""}`}>
            <button
              onClick={() => ask("List my action items and todos for this week")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-600)] transition-colors text-left w-full group"
            >
              <svg className="text-[var(--color-gray-400)] group-hover:text-[var(--color-gray-600)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              List my action items & todos for this week
            </button>
            <button
              onClick={() => ask("Summarize my last meeting")}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-600)] transition-colors text-left w-full group"
            >
              <svg className="text-[var(--color-gray-400)] group-hover:text-[var(--color-gray-600)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
              Summarize my last meeting
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-600)] transition-colors text-left w-full group">
              <svg className="text-[var(--color-gray-400)] group-hover:text-[var(--color-gray-600)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              Prepare me for the upcoming meeting
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-600)] transition-colors text-left w-full group">
              <svg className="text-[var(--color-gray-400)] group-hover:text-[var(--color-gray-600)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              Connect Gmail, Notion, and 30+ sources for richer insights.
            </button>
            <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--color-gray-50)] text-[14px] text-[var(--color-gray-600)] transition-colors text-left w-full group">
              <svg className="text-[var(--color-gray-400)] group-hover:text-[var(--color-gray-600)] transition-colors" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Prepare weekly digest, based on my meetings
            </button>
          </div>
          
        </div>
        
        <div className="absolute bottom-6 left-0 right-0 flex justify-center pb-2">
           <span className="text-[12px] text-[var(--color-gray-400)]">Consumes AI credits</span>
        </div>
      </div>
    </div>
  );
}
