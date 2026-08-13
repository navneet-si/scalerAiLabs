"use client";

import React, { useEffect, useRef } from "react";

// Modal primitive matching UX spec
type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number; // 400 for delete, 480-560 standard, 1040 search
  title?: string;
};

export function Modal({ isOpen, onClose, children, width = 480, title }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 flex items-center justify-center z-[1000]"
      style={{ backgroundColor: "rgba(12, 12, 13, 0.56)" }}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
        <div
          className="bg-white rounded-2xl z-[1001] max-h-[90vh] overflow-y-auto"
          style={{
            width: `${width}px`,
            maxWidth: "95vw",
            boxShadow: "var(--shadow-modal)",
          }}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-gray-200)]">
              <h2 className="text-[18px] font-medium text-[var(--color-gray-900)]">{title}</h2>
              <button onClick={onClose} className="text-[var(--color-gray-400)] hover:text-[var(--color-gray-600)] transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          )}
          <div className="p-6">
            {children}
          </div>
        </div>
    </div>
  );
}
