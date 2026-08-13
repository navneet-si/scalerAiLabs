"use client";

import React, { useEffect, useState, useRef } from "react";
import { api } from "@/lib/api";
import { ParticipantRead, TagRead } from "@/lib/types";

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

export function Filters({ filters, onChange }: FiltersProps) {
  const [open, setOpen] = useState(false);
  const [participants, setParticipants] = useState<ParticipantRead[]>([]);
  const [tags, setTags] = useState<TagRead[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    api.getParticipants().then(setParticipants).catch(console.error);
    api.getTags().then(setTags).catch(console.error);
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
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
        Filters
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-purple-600)]" />
        )}
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-[320px] bg-white border border-[var(--color-gray-200)] rounded-lg shadow-[var(--shadow-modal)] z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[14px] font-medium text-[var(--color-gray-900)]">Filters</span>
            <button
              className="text-[14px] text-[var(--color-purple-700)] hover:underline outline-none"
              onClick={() => {
                onChange(DEFAULT_FILTERS);
              }}
            >
              Clear all
            </button>
          </div>

          {/* Participant */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
              Participant
            </label>
            <select
              className="w-full h-8 px-2 text-[14px] border border-[var(--color-gray-300)] rounded outline-none focus:border-[var(--color-purple-500)] bg-white text-[var(--color-gray-700)]"
              value={filters.participant_id}
              onChange={(e) =>
                update({
                  participant_id: e.target.value === "" ? "" : Number(e.target.value),
                })
              }
            >
              <option value="">All participants</option>
              {participants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Tag */}
          <div className="mb-4">
            <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
              Tag
            </label>
            <select
              className="w-full h-8 px-2 text-[14px] border border-[var(--color-gray-300)] rounded outline-none focus:border-[var(--color-purple-500)] bg-white text-[var(--color-gray-700)]"
              value={filters.tag}
              onChange={(e) => update({ tag: e.target.value })}
            >
              <option value="">All tags</option>
              {tags.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="mb-4 flex gap-3">
            <div className="flex-1">
              <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
                From
              </label>
              <input
                type="date"
                className="w-full h-8 px-2 text-[14px] border border-[var(--color-gray-300)] rounded outline-none focus:border-[var(--color-purple-500)] bg-white text-[var(--color-gray-700)]"
                value={filters.date_from ? filters.date_from.split("T")[0] : ""}
                onChange={(e) =>
                  update({
                    date_from: e.target.value ? `${e.target.value}T00:00:00` : "",
                  })
                }
              />
            </div>
            <div className="flex-1">
              <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
                To
              </label>
              <input
                type="date"
                className="w-full h-8 px-2 text-[14px] border border-[var(--color-gray-300)] rounded outline-none focus:border-[var(--color-purple-500)] bg-white text-[var(--color-gray-700)]"
                value={filters.date_to ? filters.date_to.split("T")[0] : ""}
                onChange={(e) =>
                  update({
                    date_to: e.target.value ? `${e.target.value}T23:59:59` : "",
                  })
                }
              />
            </div>
          </div>

          {/* Sort */}
          <div className="mb-2">
            <label className="block text-[14px] font-medium text-[var(--color-gray-700)] mb-1">
              Sort by
            </label>
            <select
              className="w-full h-8 px-2 text-[14px] border border-[var(--color-gray-300)] rounded outline-none focus:border-[var(--color-purple-500)] bg-white text-[var(--color-gray-700)]"
              value={filters.sort}
              onChange={(e) =>
                update({ sort: e.target.value as FilterState["sort"] })
              }
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="title">Title (A–Z)</option>
              <option value="duration">Duration</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
