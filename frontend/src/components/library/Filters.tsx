"use client";

import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { ParticipantRead, TagRead } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { Checkbox } from "@/components/ui/Checkbox";

export type FilterState = {
  participant_id: number | "";
  tag: string;
  date_from: string;
  date_to: string;
  sort: "recent" | "oldest" | "title" | "duration";
};

export const DEFAULT_FILTERS: FilterState = {
  participant_id: "",
  tag: "",
  date_from: "",
  date_to: "",
  sort: "recent",
};

type FiltersProps = {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
};

type Tab = "Hosted by" | "Participants" | "Date Range" | "Duration" | "Captured From" | "Privacy";

// Icons
const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);
const ClockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
);
const TargetIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
);

export function Filters({ filters, onChange }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("Participants");
  const [participants, setParticipants] = useState<ParticipantRead[]>([]);
  // We aren't querying tags for this new UI since it has no space for it, 
  // but let's keep the API call out if unused to avoid warnings.
  const [searchQuery, setSearchQuery] = useState("");
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api.getParticipants().then(setParticipants).catch(console.error);
  }, [open]);

  // Close popover on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const update = (patch: Partial<FilterState>) => {
    onChange({ ...filters, ...patch });
  };

  const hasActiveFilters =
    filters.participant_id !== "" ||
    filters.tag !== "" ||
    filters.date_from !== "" ||
    filters.date_to !== "" ||
    filters.sort !== "recent";

  const clearAll = () => {
    onChange(DEFAULT_FILTERS);
  };

  // Predefined date ranges
  const isDateRangeMatch = (days: number | null) => {
    if (days === null) {
      return filters.date_from === "" && filters.date_to === "";
    }
    if (days === 0) {
      // Today (naive check)
      if (!filters.date_from || !filters.date_to) return false;
      const today = new Date().toISOString().split("T")[0];
      return filters.date_from.startsWith(today) && filters.date_to.startsWith(today);
    }
    if (!filters.date_from || !filters.date_to) return false;
    const fromDate = new Date(filters.date_from);
    const toDate = new Date(filters.date_to);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    // Simple heuristic
    const diff = Math.round((today.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
    return diff === days;
  };

  const applyDateRange = (days: number | null) => {
    if (days === null) {
      update({ date_from: "", date_to: "" });
      return;
    }
    const todayStr = new Date().toISOString().split("T")[0];
    if (days === 0) {
      update({ date_from: `${todayStr}T00:00:00`, date_to: `${todayStr}T23:59:59` });
      return;
    }
    const past = new Date();
    past.setDate(past.getDate() - days);
    const pastStr = past.toISOString().split("T")[0];
    update({ date_from: `${pastStr}T00:00:00`, date_to: `${todayStr}T23:59:59` });
  };

  let dateRangeSelected = "Custom Date Range";
  if (isDateRangeMatch(null)) dateRangeSelected = "Any Time";
  else if (isDateRangeMatch(0)) dateRangeSelected = "Today";
  else if (isDateRangeMatch(7)) dateRangeSelected = "Last 7 Days";
  else if (isDateRangeMatch(14)) dateRangeSelected = "Last 14 Days";
  else if (isDateRangeMatch(30)) dateRangeSelected = "Last 30 Days";

  const tabs: { id: Tab; icon: React.ReactNode; disabled?: boolean }[] = [
    { id: "Hosted by", icon: <UserIcon />, disabled: true },
    { id: "Participants", icon: <UsersIcon /> },
    { id: "Date Range", icon: <CalendarIcon /> },
    { id: "Duration", icon: <ClockIcon />, disabled: true },
    { id: "Captured From", icon: <MicIcon />, disabled: true },
    { id: "Privacy", icon: <TargetIcon />, disabled: true },
  ];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        className={`h-8 px-3 rounded text-[14px] font-medium border transition-colors inline-flex items-center gap-2 outline-none ${
          hasActiveFilters
            ? "bg-[var(--color-purple-50)] text-[var(--color-purple-700)] border-[var(--color-purple-200)]"
            : "bg-white text-[var(--color-gray-700)] border-[var(--color-gray-200)] hover:bg-[var(--color-gray-50)]"
        }`}
        onClick={() => setOpen(!open)}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
        </svg>
        Filters
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[580px] h-[380px] bg-white border border-[var(--color-gray-200)] rounded-lg shadow-[var(--shadow-modal)] z-50 flex overflow-hidden text-[14px]">
          {/* Left Navigation pane */}
          <div className="w-[200px] bg-white flex flex-col py-2 border-r border-[var(--color-gray-200)] shrink-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                disabled={t.disabled}
                onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-[13px] text-left transition-colors ${
                  t.disabled ? "opacity-50 cursor-not-allowed text-[var(--color-gray-500)]" : 
                  activeTab === t.id ? "bg-[var(--color-purple-50)] text-[var(--color-purple-700)] font-medium" : "text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)]"
                }`}
              >
                <span className={activeTab === t.id ? "text-[var(--color-purple-600)]" : "text-[var(--color-gray-400)]"}>
                  {t.icon}
                </span>
                {t.id}
              </button>
            ))}
            
            <div className="mt-auto pt-4 px-4 pb-2">
              <button 
                onClick={clearAll}
                className="text-[13px] text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>

          {/* Right Content pane */}
          <div className="flex-1 bg-white flex flex-col overflow-hidden">
            {activeTab === "Participants" && (
              <div className="flex flex-col h-full">
                <div className="flex flex-col px-4 pt-4 pb-2 border-b border-[var(--color-gray-100)] shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="relative flex-1 mr-4">
                      <svg className="absolute left-2.5 top-2 text-[var(--color-gray-400)]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <input 
                        type="text" 
                        placeholder="Search participant" 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-white border border-[var(--color-gray-200)] focus:border-[var(--color-purple-500)] rounded outline-none transition-colors placeholder-[var(--color-gray-400)]"
                      />
                    </div>
                    <button onClick={() => update({ participant_id: "" })} className="text-[12px] text-[var(--color-gray-400)] hover:text-[var(--color-gray-700)]">
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                  {participants.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.email && p.email.toLowerCase().includes(searchQuery.toLowerCase()))).map(p => (
                    <label key={p.id} className="flex items-center gap-3 px-2 py-2 hover:bg-[var(--color-gray-50)] rounded cursor-pointer group">
                      <Avatar name={p.name} initials={p.initials} color={p.avatar_color} size={24} />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="text-[13px] text-[var(--color-gray-900)] truncate">{p.name}</span>
                        {p.email && <span className="text-[12px] text-[var(--color-gray-500)] truncate">{p.email}</span>}
                      </div>
                      <div className="ml-auto flex items-center h-full">
                        <Checkbox 
                          checked={filters.participant_id === p.id} 
                          onChange={(e) => update({ participant_id: e.target.checked ? p.id : "" })} 
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "Date Range" && (
              <div className="flex flex-col p-4 space-y-1 flex-1 overflow-y-auto">
                {[
                  { label: "Any Time", days: null },
                  { label: "Today", days: 0 },
                  { label: "Last 7 Days", days: 7 },
                  { label: "Last 14 Days", days: 14 },
                  { label: "Last 30 Days", days: 30 },
                ].map(opt => (
                  <label key={opt.label} className="flex items-center justify-between p-2 hover:bg-[var(--color-gray-50)] rounded cursor-pointer">
                    <span className="text-[13px] text-[var(--color-gray-700)]">{opt.label}</span>
                    <input 
                      type="radio" 
                      name="date_range"
                      checked={dateRangeSelected === opt.label}
                      onChange={() => applyDateRange(opt.days)}
                      className="w-4 h-4 text-[var(--color-purple-600)] bg-gray-100 border-gray-300 focus:ring-[var(--color-purple-500)] cursor-pointer"
                    />
                  </label>
                ))}
                
                <label className="flex items-center justify-between p-2 hover:bg-[var(--color-gray-50)] rounded cursor-pointer">
                  <span className="text-[13px] text-[var(--color-gray-700)]">Custom Date Range</span>
                  <div className="flex items-center gap-3">
                    <CalendarIcon />
                    <input 
                      type="radio" 
                      name="date_range"
                      checked={dateRangeSelected === "Custom Date Range"}
                      onChange={() => update({ date_from: filters.date_from || new Date().toISOString().split("T")[0] + "T00:00:00" })} // Dummy change to trigger custom
                      className="w-4 h-4 text-[var(--color-purple-600)] bg-gray-100 border-gray-300 focus:ring-[var(--color-purple-500)] cursor-pointer"
                    />
                  </div>
                </label>
                
                {dateRangeSelected === "Custom Date Range" && (
                  <div className="flex gap-3 px-2 pt-3 mt-1">
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-[var(--color-gray-500)] mb-1 uppercase tracking-wider">From</label>
                      <input
                        type="date"
                        className="w-full h-8 px-2 text-[13px] border border-[var(--color-gray-200)] rounded outline-none focus:border-[var(--color-purple-500)] text-[var(--color-gray-700)]"
                        value={filters.date_from ? filters.date_from.split("T")[0] : ""}
                        onChange={(e) => update({ date_from: e.target.value ? `${e.target.value}T00:00:00` : "" })}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-medium text-[var(--color-gray-500)] mb-1 uppercase tracking-wider">To</label>
                      <input
                        type="date"
                        className="w-full h-8 px-2 text-[13px] border border-[var(--color-gray-200)] rounded outline-none focus:border-[var(--color-purple-500)] text-[var(--color-gray-700)]"
                        value={filters.date_to ? filters.date_to.split("T")[0] : ""}
                        onChange={(e) => update({ date_to: e.target.value ? `${e.target.value}T23:59:59` : "" })}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === "Duration" && (
              <div className="flex flex-col p-4 space-y-1 flex-1 overflow-y-auto opacity-50 pointer-events-none">
                {["< 15 mins", "15 to 30 Mins", "30 to 60 mins", "60 to 90 mins", "90+ mins"].map(label => (
                  <label key={label} className="flex items-center justify-between p-2 rounded">
                    <span className="text-[13px] text-[var(--color-gray-700)]">{label}</span>
                    <input type="radio" disabled className="w-4 h-4 text-gray-400 bg-gray-100 border-gray-300" />
                  </label>
                ))}
              </div>
            )}
            
            {activeTab === "Captured From" && (
              <div className="flex flex-col p-4 space-y-1 flex-1 overflow-y-auto opacity-50 pointer-events-none">
                {["Meeting Notetaker", "Chrome Extension", "Mobile App", "Desktop App", "Uploads", "Voice Agent"].map(label => (
                  <label key={label} className="flex items-center justify-between p-2 rounded">
                    <span className="text-[13px] text-[var(--color-gray-700)]">{label}</span>
                    <Checkbox disabled checked={false} onChange={() => {}} />
                  </label>
                ))}
              </div>
            )}

            {["Hosted by", "Privacy"].includes(activeTab) && (
              <div className="flex flex-col p-4 space-y-1 flex-1 overflow-y-auto opacity-50 pointer-events-none items-center justify-center">
                <span className="text-[13px] text-[var(--color-gray-500)]">Not implemented</span>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
