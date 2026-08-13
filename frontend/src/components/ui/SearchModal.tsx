"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./Modal";
import { Input } from "./Input";
import { Button } from "./Button";
import { api } from "@/lib/api";
import { MeetingListItem } from "@/lib/types";
import { MeetingRow } from "../library/MeetingRow";
import { Filters, FilterState, DEFAULT_FILTERS } from "../library/Filters";
import { LoadingState } from "./Loading";

type SearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [results, setResults] = useState<MeetingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // For selection, though we might not need actions here, we'll keep it empty for MeetingRow
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!isOpen) return;
    
    // Set loading state if we have a query or filters
    if (query || Object.values(filters).some(v => v !== "" && v !== "recent" && v !== undefined)) {
      setLoading(true);
    } else {
      setResults([]);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.getMeetings({
          search: query,
          participant_id: filters.participant_id || undefined,
          tag: filters.tag || undefined,
          date_from: filters.date_from || undefined,
          date_to: filters.date_to || undefined,
          sort: filters.sort
        });
        setResults(res.items);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, filters, isOpen]);
  
  const handleToggle = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} width={1040}>
      <div className="flex flex-col h-[70vh] -m-6">
        {/* Header row with search input */}
        <div className="px-6 py-4 border-b border-[var(--color-gray-200)] flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1">
             <svg className="absolute left-3 top-2.5 text-[var(--color-gray-400)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input 
              ref={inputRef}
              className="w-full pl-10 pr-4 py-2 bg-transparent border-none outline-none text-[16px] text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)]"
              placeholder="Search meetings by title or keyword..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-4">
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="text-[14px] text-[var(--color-purple-600)] hover:text-[var(--color-purple-700)] font-medium"
              >
                Clear
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded-md text-[var(--color-gray-400)] hover:bg-[var(--color-gray-100)] transition-colors">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="px-6 py-3 border-b border-[var(--color-gray-200)] bg-[var(--color-gray-50)] shrink-0">
          <Filters filters={filters} onChange={setFilters} />
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto p-6 bg-[var(--color-background)]">
          {loading ? (
            <div className="py-10"><LoadingState /></div>
          ) : results.length > 0 ? (
            <div className="flex flex-col gap-2 mx-auto max-w-[789px]">
              {results.map((meeting) => (
                <MeetingRow 
                  key={meeting.id} 
                  meeting={meeting} 
                  checked={selectedIds.has(meeting.id)} 
                  onToggle={(checked) => handleToggle(meeting.id, checked)}
                />
              ))}
            </div>
          ) : query || Object.values(filters).some(v => v !== "" && v !== "recent" && v !== undefined) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--color-gray-50)] flex items-center justify-center mb-4 border border-[var(--color-gray-100)]">
                <svg className="text-[var(--color-gray-500)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-1">
                No results found for &quot;{query}&quot;
              </h3>
              <p className="text-[14px] text-[var(--color-gray-500)] mb-6 max-w-sm">
                Try a different keyword or check for spelling.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[14px] text-[var(--color-gray-500)]">
              Start typing to search your meetings
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
