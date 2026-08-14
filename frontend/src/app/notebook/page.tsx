"use client";

import React, { useEffect, useState, useMemo } from "react";
import { api } from "@/lib/api";
import { MeetingListItem } from "@/lib/types";
import { DateGroup } from "@/components/library/DateGroup";
import { EmptyState } from "@/components/library/EmptyState";
import { LoadingState } from "@/components/ui/Loading";
import { Button } from "@/components/ui/Button";
import { Filters, FilterState, DEFAULT_FILTERS } from "@/components/library/Filters";
import { UploadModal } from "@/components/library/UploadModal";
import { CreateMeetingModal } from "@/components/library/CreateMeetingModal";
import { SearchModal } from "@/components/ui/SearchModal";
import { RightChatBot } from "@/components/library/RightChatBot";

// Helper to group meetings by date label "Thu, Sep 25, 2025"
function groupMeetingsByDate(meetings: MeetingListItem[]) {
  const groups: Record<string, MeetingListItem[]> = {};
  
  meetings.forEach(m => {
    const d = new Date(m.meeting_date);
    const label = d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(m);
  });
  
  return groups;
}

export default function LibraryPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const fetchMeetings = async (currentOffset: number, append = false) => {
    try {
      if (!append) setLoading(true);
      else setLoadingMore(true);
      
      const res = await api.getMeetings({ 
        limit, 
        offset: currentOffset, 
        participant_id: filters.participant_id || undefined,
        tag: filters.tag || undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        sort: filters.sort
      });
      if (append) {
        setMeetings(prev => [...prev, ...res.items]);
      } else {
        setMeetings(res.items);
      }
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Reset and fetch when filters change
    setOffset(0);
    fetchMeetings(0, false);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    fetchMeetings(newOffset, true);
  };

  const handleToggleMeeting = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleToggleGroup = (groupMeetings: MeetingListItem[], checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      groupMeetings.forEach(m => {
        if (checked) next.add(m.id);
        else next.delete(m.id);
      });
      return next;
    });
  };

  const groups = useMemo(() => groupMeetingsByDate(meetings), [meetings]);
  
  const hasMore = meetings.length < total;

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Secondary Left Sidebar */}
      <div className="w-[260px] flex-shrink-0 border-r border-[var(--color-gray-200)] flex flex-col bg-white">
        <div className="p-4">
          <div className="relative">
            <svg className="absolute left-3 top-2.5 text-[var(--color-gray-400)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input type="text" placeholder="Search channels" className="w-full h-9 pl-9 pr-3 text-[13px] bg-transparent outline-none placeholder-[var(--color-gray-400)] text-[var(--color-gray-900)] border-none" />
          </div>
        </div>

        <div className="flex flex-col px-2 gap-0.5">
          <button className="flex items-center gap-3 px-3 py-2 rounded-md bg-[var(--color-purple-50)] text-[var(--color-purple-700)] text-[13px] font-medium transition-colors text-left w-full">
            <span className="text-[15px] font-bold">#</span>
            My Meetings
          </button>
          
          <button className="flex items-center gap-3 px-3 py-2 rounded-md text-[var(--color-gray-600)] hover:bg-[var(--color-gray-50)] hover:text-[var(--color-gray-900)] text-[13px] font-medium transition-colors text-left w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
            All Meetings
          </button>

          <button className="flex items-center gap-3 px-3 py-2 rounded-md text-[var(--color-gray-600)] hover:bg-[var(--color-gray-50)] hover:text-[var(--color-gray-900)] text-[13px] font-medium transition-colors text-left w-full">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>
            Voice Agent Meetings
          </button>
        </div>

        <div className="mt-8 px-5">
          <h3 className="text-[13px] font-medium text-[var(--color-gray-600)] mb-6">All channels</h3>
          
          <div className="flex flex-col items-center justify-center text-center mt-4">
            <div className="text-[#F2B8D2] text-[24px] font-light mb-3">#</div>
            <p className="text-[13px] text-[var(--color-gray-500)] leading-relaxed mb-4 max-w-[180px]">
              Create channels to organize your conversations
            </p>
            <button className="flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-md border border-[var(--color-gray-200)] text-[13px] font-medium text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] transition-colors shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Channel
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header / Tabs Area */}
        <div className="flex flex-col px-8 pt-6 pb-4 border-b border-[var(--color-gray-200)] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center p-1 bg-[var(--color-gray-50)] rounded-lg border border-[var(--color-gray-200)]">
              <button className="px-4 py-1.5 text-[14px] font-medium bg-white shadow-sm rounded-md text-[var(--color-gray-900)] border border-[var(--color-gray-200)]">Hosted by me</button>
              <button className="px-4 py-1.5 text-[14px] font-medium text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] rounded-md">Shared with me</button>
            </div>
            
            <Filters filters={filters} onChange={setFilters} />
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 bg-[var(--color-purple-600)] text-white hover:bg-[var(--color-purple-700)]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New meeting
            </Button>

            <Button
              variant="secondary"
              aria-label="Search meetings"
              onClick={() => setSearchOpen(true)}
              className="!w-9 !h-9 !p-0 flex items-center justify-center"
            >
               <svg className="text-[var(--color-gray-500)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8 bg-white">
        <div className="max-w-[789px]">
          {loading ? (
            <LoadingState />
          ) : meetings.length === 0 ? (
            <EmptyState 
              type={filters.participant_id || filters.tag || filters.date_from || filters.date_to ? "no-results" : "no-meetings"} 
              onClearSearch={() => setFilters(DEFAULT_FILTERS)} 
              onUpload={() => setUploadOpen(true)}
            />
          ) : (
            <div className="pb-20">
              {Object.entries(groups).map(([dateLabel, groupMeetings]) => (
                <DateGroup 
                  key={dateLabel}
                  dateLabel={dateLabel} 
                  meetings={groupMeetings} 
                  selectedIds={selectedIds}
                  onToggleMeeting={handleToggleMeeting}
                  onToggleGroup={(checked) => handleToggleGroup(groupMeetings, checked)}
                />
              ))}

              {hasMore ? (
                <div className="mt-8 flex justify-center">
                  <Button variant="secondary" onClick={handleLoadMore} disabled={loadingMore}>
                    {loadingMore ? "Loading..." : "Load More"}
                  </Button>
                </div>
              ) : (
                <div className="mt-12 text-center text-[14px] text-[var(--color-gray-500)]">
                  You&apos;ve reached the end of your meetings.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      </div>
      
      <RightChatBot />
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreateMeetingModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
