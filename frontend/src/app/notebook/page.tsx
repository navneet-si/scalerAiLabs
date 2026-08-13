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
    <div className="flex flex-col h-full bg-white">
      {/* Top Header / Tabs Area */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-[var(--color-gray-200)]">
        <div className="flex items-center gap-6">
          <div className="text-[14px] font-medium text-[var(--color-purple-700)] border-b-2 border-[var(--color-purple-600)] pb-4 -mb-4">
            My Meetings
          </div>
          <div className="text-[14px] font-medium text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] cursor-pointer pb-4 -mb-4 border-b-2 border-transparent hover:border-[var(--color-gray-200)] transition-colors">
            Shared with me
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Filters filters={filters} onChange={setFilters} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-8 bg-[var(--color-background)]">
        <div className="max-w-[789px] mx-auto">
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
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
