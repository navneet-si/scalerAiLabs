"use client";
import React, { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { ParticipantRead, QueryResponse } from "@/lib/types";
import { formatMs } from "@/lib/time";
import { useRouter } from "next/navigation";

export function RightChatBot({ fullScreen = false }: { fullScreen?: boolean }) {
  const router = useRouter();
  const [user, setUser] = useState<ParticipantRead | null>(null);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResponse | null>(null);
  const [showAllSources, setShowAllSources] = useState(false);
  const [pastQueries, setPastQueries] = useState<{q: string, r: QueryResponse}[]>([]);

  useEffect(() => {
    api.getMe().then(setUser).catch(console.error);
  }, []);

  const ask = async (q: string) => {
    if (q.trim().length < 3) return;
    
    if (result) {
      setPastQueries(prev => [...prev, { q: question, r: result }]);
    }
    
    setQuestion(q);
    setLoading(true);
    setError(null);
    setResult(null);
    setShowAllSources(false);
    
    try {
      const res = await api.askQuestion(q.trim());
      setResult(res);
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(question);
    }
  };

  const openCitation = (meetingId: number, startMs: number) => {
    router.push(`/notebook/${meetingId}?t=${startMs}`);
  };

  const renderResult = (res: QueryResponse) => (
    <div className="animate-in fade-in duration-300">
      <p className="text-[14px] leading-relaxed text-[var(--color-gray-900)] whitespace-pre-wrap">
        {res.answer}
      </p>

      {res.citations.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[12px] font-medium text-[var(--color-gray-500)] uppercase tracking-wide mb-2">
            Sources
          </h4>
          <ul className="flex flex-col gap-2">
            {(showAllSources ? res.citations : res.citations.slice(0, 4)).map((c, i) => (
              <li key={`${c.meeting_id}-${c.start_ms}-${i}`}>
                <button
                  onClick={() => openCitation(c.meeting_id, c.start_ms)}
                  className="w-full text-left p-3 rounded-[8px] border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)] transition-colors outline-none"
                >
                  <span className="flex items-center justify-between text-[13px] font-medium text-[var(--color-gray-900)] mb-1">
                    <span className="truncate pr-2">{c.meeting_title}</span>
                    <span className="text-[var(--color-purple-600)] shrink-0">
                      {formatMs(c.start_ms)}
                    </span>
                  </span>
                  <span className="block text-[13px] leading-relaxed text-[var(--color-gray-600)] line-clamp-2">
                    {c.speaker_label ? <span className="font-medium mr-1 text-[var(--color-gray-800)]">{c.speaker_label}:</span> : ""}
                    {c.text}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          
          {res.citations.length > 4 && (
            <button 
              onClick={() => setShowAllSources(!showAllSources)}
              className="mt-2 text-[12px] font-medium text-[var(--color-purple-600)] hover:text-[var(--color-purple-700)] transition-colors outline-none"
            >
              {showAllSources ? "Show fewer sources" : `Show all ${res.citations.length} sources`}
            </button>
          )}
        </div>
      )}
      
      <p className="mt-4 text-[11px] text-[var(--color-gray-400)]">
        {res.answered_by === "keyword"
          ? "keyword search"
          : "groq · llama-3.3-70b-versatile"}
      </p>
    </div>
  );

  return (
    <div className={`${fullScreen ? 'w-full' : 'w-[360px] border-l border-[var(--color-gray-200)]'} flex-shrink-0 flex flex-col bg-white h-full relative`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[72px] border-b border-[var(--color-gray-100)] flex-shrink-0">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-[var(--color-purple-500)] to-[var(--color-blue-500)] flex items-center justify-center text-[10px] text-white">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1.5a.5.5 0 0 0-.5.5v1.5a.5.5 0 0 0 .5.5H12a4 4 0 0 1 4 4v3a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-3a4 4 0 0 1 4-4h1.5a.5.5 0 0 0 .5-.5V8.5a.5.5 0 0 0-.5-.5H12a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path></svg>
          </div>
          <span className="text-[14px] font-medium text-[var(--color-gray-900)]">Ask Fred</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--color-gray-400)]">
          <button className="hover:text-[var(--color-gray-600)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          </button>
          <button className="hover:text-[var(--color-gray-600)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          </button>
        </div>
      </div>

      {/* Main Content (Scrollable) */}
      <div className="flex-1 overflow-auto flex flex-col p-5">
        {!result && !loading && pastQueries.length === 0 ? (
          <>
            {/* Ad Banner */}
            <div className="bg-[#F8F9FE] rounded-[12px] p-4 flex items-start gap-3 mb-8 border border-[#E9EDFA]">
              <div className="flex items-center justify-center shrink-0 w-8 h-8 bg-white rounded shadow-sm relative border border-[var(--color-gray-100)]">
                 <div className="flex items-center gap-[2px]">
                   <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
                   <div className="w-2.5 h-2.5 rounded-sm bg-blue-500"></div>
                 </div>
              </div>
              <div className="flex-1 text-[13px] leading-[1.4] text-[var(--color-gray-700)]">
                <span className="font-semibold text-[var(--color-gray-900)]">Connect Slack and Gmail</span> — get answers with full context.
              </div>
              <button className="text-[13px] font-medium text-[var(--color-purple-600)] flex items-center gap-1 hover:text-[var(--color-purple-700)] whitespace-nowrap">
                Connect
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Sparkle Icon */}
            <div className="mb-6 text-[var(--color-emerald-400)]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L14.83 9.17L22 12L14.83 14.83L12 22L9.17 14.83L2 12L9.17 9.17L12 2Z" />
              </svg>
            </div>

            {/* Greeting */}
            <div className="mb-6">
              <h2 className="text-[15px] font-semibold text-[var(--color-gray-900)] mb-1">
                Hi {user?.name?.split(" ")[0].toUpperCase() || "THERE"}!
              </h2>
              <p className="text-[15px] text-[var(--color-gray-600)]">Get ready for your meeting</p>
            </div>

            {/* Suggestion Pills */}
            <div className="flex flex-col gap-3">
              <button onClick={() => ask("What are my action items?")} className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)] transition-colors text-[13px] font-medium text-[var(--color-gray-700)] text-left w-max shadow-sm">
                <span className="text-[16px] bg-green-100 text-green-600 rounded-sm w-5 h-5 flex items-center justify-center">✅</span>
                My action items
              </button>
              <button onClick={() => ask("What were the key decisions?")} className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)] transition-colors text-[13px] font-medium text-[var(--color-gray-700)] text-left w-max shadow-sm">
                <span className="text-[16px] bg-red-50 text-red-500 rounded-sm w-5 h-5 flex items-center justify-center">🎯</span>
                Key decisions
              </button>
              <button onClick={() => ask("What are the key initiatives?")} className="flex items-center gap-3 px-4 py-2.5 rounded-full border border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)] transition-colors text-[13px] font-medium text-[var(--color-gray-700)] text-left w-max shadow-sm">
                <span className="text-[16px] bg-red-50 text-red-500 rounded-sm w-5 h-5 flex items-center justify-center">📌</span>
                Key initiatives
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-6">
            {pastQueries.map((pq, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <div className="bg-[var(--color-gray-50)] p-3 rounded-lg border border-[var(--color-gray-200)] self-end max-w-[90%] text-[14px] text-[var(--color-gray-900)]">
                  {pq.q}
                </div>
                {renderResult(pq.r)}
              </div>
            ))}
            
            {(loading || result || error) && (
              <div className="flex flex-col gap-4">
                <div className="bg-[var(--color-gray-50)] p-3 rounded-lg border border-[var(--color-gray-200)] self-end max-w-[90%] text-[14px] text-[var(--color-gray-900)]">
                  {question}
                </div>
                
                {error && <p className="text-[14px] text-[var(--color-pink-700)]">{error}</p>}
                
                {loading && (
                  <div className="flex flex-col gap-3 animate-pulse">
                    <div className="h-4 bg-[var(--color-gray-100)] rounded w-full"></div>
                    <div className="h-4 bg-[var(--color-gray-100)] rounded w-5/6"></div>
                    <div className="h-4 bg-[var(--color-gray-100)] rounded w-4/6"></div>
                  </div>
                )}
                
                {result && renderResult(result)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Input Area */}
      <div className="p-4 pt-2 shrink-0 bg-white">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[var(--color-gray-200)] w-max mb-3 text-[12px] font-medium text-[var(--color-gray-600)] shadow-sm">
          <span className="text-[var(--color-purple-600)]">#</span> My Meetings
        </div>
        
        <div className="relative rounded-[12px] border border-[var(--color-gray-200)] bg-white shadow-sm focus-within:ring-1 focus-within:ring-[var(--color-purple-500)] focus-within:border-[var(--color-purple-500)] transition-all">
          <textarea
            rows={1}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask anything. Type / to run AI skills."
            className="w-full text-[13px] bg-transparent p-3 pb-12 focus:outline-none resize-none placeholder:text-[var(--color-gray-400)] text-[var(--color-gray-900)] disabled:opacity-50"
          />
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors rounded-md hover:bg-[var(--color-gray-100)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
              <button className="p-1.5 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors rounded-md hover:bg-[var(--color-gray-100)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors rounded-md hover:bg-[var(--color-gray-100)]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              </button>
              <button 
                onClick={() => ask(question)}
                disabled={loading || question.trim().length < 3}
                className="p-1.5 bg-[var(--color-purple-500)] text-white hover:bg-[var(--color-purple-600)] transition-colors rounded-md ml-1 shadow-sm disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
