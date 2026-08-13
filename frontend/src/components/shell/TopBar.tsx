"use client";

import { AskPanel } from "../ask/AskPanel";
import React, { useState, useEffect } from "react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { UploadModal } from "../library/UploadModal";
import { CreateSeedModal } from "../library/CreateSeedModal";
import { SearchModal } from "../ui/SearchModal";

// 52px top bar, bottom border 1px solid #EAECF0
export function TopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
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
          {/* Page Title Left (placeholder, can be dynamic based on route later) */}
          <span className="text-[14px] font-medium text-[var(--color-gray-900)]"></span>
        </div>

        <div className="flex-[2] flex justify-center">
          {/* Centered Search */}
          <div className="relative w-[400px]">
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

        <div className="flex-[1] flex items-center justify-end gap-3 relative">
          {/* Split Button */}
          <div className="relative flex shadow-sm rounded">
            <Button size="sm" className="rounded-r-none border-r border-purple-700" onClick={() => setUploadOpen(true)}>
              Upload
            </Button>
            <Button 
              size="sm" 
              className="rounded-l-none px-2" 
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
            </Button>
            
            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-[var(--color-gray-200)] shadow-[var(--shadow-modal)] rounded-lg py-1 z-50 overflow-hidden">
                <button 
                  className="w-full text-left px-4 py-2 text-[14px] text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] transition-colors"
                  onClick={() => {
                    setMenuOpen(false);
                    setSeedOpen(true);
                  }}
                >
                  Create Seeded Meeting
                </button>
              </div>
            )}
          </div>
        </div>
        <button
        onClick={() => setAskOpen(true)}
        className="ml-2 h-8 px-3 text-[14px] font-medium rounded-[4px] border border-[var(--color-gray-200)] text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] outline-none"
      >
        Ask
      </button>
      <AskPanel isOpen={askOpen} onClose={() => setAskOpen(false)} />
    </header>
      
      <UploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} />
      <CreateSeedModal isOpen={seedOpen} onClose={() => setSeedOpen(false)} />
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
