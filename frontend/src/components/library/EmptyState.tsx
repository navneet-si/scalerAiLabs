import React from "react";
import { Button } from "../ui/Button";

type EmptyStateProps = {
  type: "no-results" | "no-meetings";
  query?: string;
  onClearSearch?: () => void;
  onUpload?: () => void;
};

// Reusable empty state component based on UX spec
export function EmptyState({ type, query, onClearSearch, onUpload }: EmptyStateProps) {
  const isSearch = type === "no-results";

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px] text-center">
      <div className="w-12 h-12 rounded-full bg-[var(--color-gray-50)] flex items-center justify-center mb-4 border border-[var(--color-gray-100)]">
        {isSearch ? (
          <svg className="text-[var(--color-gray-500)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        ) : (
          <svg className="text-[var(--color-gray-500)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
        )}
      </div>

      <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-1">
        {isSearch ? `No results found for "${query}"` : "No meetings yet"}
      </h3>
      
      <p className="text-[14px] text-[var(--color-gray-500)] mb-6 max-w-sm">
        {isSearch 
          ? "Try a different keyword or check for spelling."
          : "Upload an audio or video file to generate a transcript, summary, and action items."}
      </p>

      {isSearch ? (
        <Button variant="secondary" onClick={onClearSearch}>
          Clear Search
        </Button>
      ) : (
        <Button onClick={onUpload}>
          Upload audio or video
        </Button>
      )}
    </div>
  );
}
