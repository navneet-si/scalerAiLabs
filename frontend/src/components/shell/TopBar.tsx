"use client";

import React, { useState, useEffect } from "react";
import { SearchModal } from "../ui/SearchModal";

import { usePathname } from "next/navigation";

// 52px top bar, bottom border 1px solid #EAECF0
export function TopBar() {
  const pathname = usePathname();

  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <header className="h-[52px] flex-shrink-0 flex items-center justify-between px-4 border-b border-[var(--color-gray-200)] bg-white relative z-40">
        <div className="flex-[1]">
          {/* Page Title Left */}
          <span className="text-[14px] font-medium text-[var(--color-gray-900)]">
            {pathname === '/upload' ? 'Uploads' : (pathname === '/notebook' || pathname.startsWith('/notebook/') || pathname === '/') ? 'Meetings' : ''}
          </span>
        </div>

        <div className="flex-[2] flex justify-center">
          {/* Centered Search */}
          <div className="relative w-full max-w-[400px]">
            <button 
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center h-8 pl-9 pr-14 text-[14px] text-[var(--color-gray-500)] bg-white border border-[var(--color-gray-200)] rounded-md hover:bg-[var(--color-gray-50)] transition-colors text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-purple-500)]"
            >
              <svg className="absolute left-3 top-2 text-[var(--color-gray-400)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              Search by title or keyword
              <span className="absolute right-3 top-1.5 text-[12px] text-[var(--color-gray-400)] font-medium px-1.5 border border-[var(--color-gray-200)] rounded bg-[var(--color-gray-50)]">
                Ctrl + K
              </span>
            </button>
          </div>
        </div>

        <div className="flex-[1] flex items-center justify-end gap-3 relative pr-2">
          <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[13px] font-medium rounded-[8px] hover:bg-emerald-100 transition-colors border border-emerald-100">
            Upgrade
          </button>
          
          <div className="flex rounded-[8px] overflow-hidden border border-[var(--color-purple-600)] h-[32px]">
            <button className="flex items-center gap-1.5 px-3 bg-[var(--color-purple-600)] hover:bg-[var(--color-purple-700)] text-white text-[13px] font-medium transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"></path><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
              Capture
            </button>
            <div className="w-[1px] bg-[#5324b3]"></div>
            <button className="px-2 bg-[var(--color-purple-600)] hover:bg-[var(--color-purple-700)] text-white transition-colors flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
          </div>

          <button className="text-[var(--color-purple-600)] hover:bg-[var(--color-purple-50)] p-1.5 rounded-full transition-colors ml-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>

          <button className="text-[var(--color-gray-500)] hover:bg-[var(--color-gray-100)] p-1.5 rounded-full transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          </button>

          <div className="w-8 h-8 bg-[#1f2937] text-white flex items-center justify-center rounded-md text-[13px] font-medium ml-1 cursor-pointer">
            N
          </div>
        </div>
    </header>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
