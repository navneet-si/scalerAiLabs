"use client";

import React, { useRef, useState, MouseEvent } from "react";
import { formatMs } from "@/lib/time";

// Cycled by the speed control. Matches the reference product's options.
const RATES = [0.5, 1, 1.25, 1.5, 2];

type PlayerBarProps = {
  currentTimeMs: number;
  durationMs: number;
  playing: boolean;
  rate: number;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (ms: number) => void;
  onRateChange: (rate: number) => void;
};

export function PlayerBar({
  currentTimeMs,
  durationMs,
  playing,
  rate,
  onPlay,
  onPause,
  onSeek,
  onRateChange,
}: PlayerBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progressPercent = durationMs > 0 ? Math.min(100, Math.max(0, (currentTimeMs / durationMs) * 100)) : 0;

  const handleDrag = (e: globalThis.MouseEvent | MouseEvent) => {
    if (!progressBarRef.current || durationMs === 0) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const newMs = (x / rect.width) * durationMs;
    onSeek(newMs);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    handleDrag(e);
    
    const onPointerMove = (e: globalThis.MouseEvent) => {
      handleDrag(e);
    };
    
    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
    
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  return (
    <div className="h-14 bg-white border-t border-[var(--color-gray-200)] flex items-center px-4 relative flex-shrink-0">
      {/* Progress Bar (edge to edge above the player bar) */}
      <div 
        ref={progressBarRef}
        className="absolute top-0 left-0 w-full h-[3px] bg-[var(--color-gray-200)] cursor-pointer touch-none group"
        onPointerDown={handlePointerDown}
      >
        <div 
          className="h-full bg-[var(--color-purple-600)] relative"
          style={{ width: `${progressPercent}%` }}
        >
          {/* Draggable Knob */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 bg-[var(--color-purple-600)] rounded-full hover:scale-125 transition-transform" />
        </div>
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-[14px] text-[var(--color-gray-900)]">
          {formatMs(currentTimeMs)} <span className="text-[var(--color-gray-500)]">/ {formatMs(durationMs)}</span>
        </span>
      </div>

      <div className="flex-[2] flex justify-center items-center gap-4">
        <button
          className="text-[14px] font-medium text-[var(--color-gray-700)] w-10 text-center outline-none"
          title="Playback speed"
          onClick={() => onRateChange(RATES[(RATES.indexOf(rate) + 1) % RATES.length] ?? 1)}
        >
          {rate}×
        </button>
        
        <button className="text-[var(--color-gray-700)] hover:text-[var(--color-gray-900)] outline-none" onClick={() => onSeek(currentTimeMs - 10000)}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 1 3 5 7 9"/></svg>
        </button>

        <button 
          className="w-10 h-10 rounded-full bg-[var(--color-purple-600)] flex items-center justify-center text-white hover:bg-[var(--color-purple-700)] transition-colors outline-none shadow-sm"
          onClick={playing ? onPause : onPlay}
        >
          {playing ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          )}
        </button>

        <button className="text-[var(--color-gray-700)] hover:text-[var(--color-gray-900)] outline-none" onClick={() => onSeek(currentTimeMs + 10000)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11V9a4 4 0 0 0-4-4H3"/><polyline points="17 1 21 5 17 9"/></svg>
        </button>

        <button className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] outline-none ml-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
        </button>
      </div>

      <div className="flex-1 flex justify-end gap-4">
        {/* Additional actions from spec */}
        <button className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>
        <button className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg></button>
        <button className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"/></svg></button>
        <button className="text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 14V2"/><path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"/></svg></button>
      </div>
    </div>
  );
}
