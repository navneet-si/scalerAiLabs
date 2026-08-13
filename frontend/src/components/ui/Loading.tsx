import React from "react";

// The animated three-dot purple loading state from UX spec
export function LoadingState({ text = "Loading things up..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[300px]">
      <div className="flex gap-1.5 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-purple-600)] animate-bounce" style={{ animationDelay: "0ms" }}></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-purple-600)] animate-bounce" style={{ animationDelay: "150ms" }}></div>
        <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-purple-600)] animate-bounce" style={{ animationDelay: "300ms" }}></div>
      </div>
      <p className="text-[14px] text-[var(--color-gray-500)] font-medium">{text}</p>
    </div>
  );
}
