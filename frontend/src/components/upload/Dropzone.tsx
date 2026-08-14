"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";

type DropzoneProps = {
  onFileSelect: (file: File) => void;
};

export function Dropzone({ onFileSelect }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`border-[2px] border-dashed rounded-[12px] p-12 text-center cursor-pointer transition-colors ${
        isDragActive 
          ? 'border-[var(--color-purple-500)] bg-[var(--color-purple-50)]' 
          : 'border-[var(--color-purple-300)] bg-white hover:border-[var(--color-purple-400)] hover:bg-[var(--color-purple-50)]'
      }`}
    >
      <input 
        type="file" 
        ref={inputRef}
        onChange={handleChange}
        accept=".vtt,.json,.txt"
        className="hidden"
      />
      <div className="flex flex-col items-center justify-center gap-3">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-purple-600)] mb-2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <h3 className="text-[18px] font-medium text-[var(--color-gray-900)]">Upload a transcript to create a meeting</h3>
        <p className="text-[13px] text-[var(--color-gray-500)]">
          Browse or drag and drop <strong>VTT</strong>, <strong>JSON</strong> or <strong>TXT</strong> transcripts.
          Audio and video are not transcribed.
        </p>
        <Button className="mt-4 px-6 bg-[#6941C6] hover:bg-[#53389E] text-white rounded-md" onClick={(e) => { e.preventDefault(); inputRef.current?.click(); }}>
          Browse Files
        </Button>
      </div>
    </div>
  );
}
