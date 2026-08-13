"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

// Toast context for showing ~6s toasts matching UX spec

type ToastProps = {
  id: number;
  message: string;
};

type ToastContextType = {
  addToast: (options: { type: "success" | "error" | "info"; title: string }) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  let nextId = useRef(0);

  const addToast = useCallback((options: { type: "success" | "error" | "info"; title: string }) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message: options.title }]);
    
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5996); // ~6 seconds from spec
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {toasts.length > 0 && (
        <ol className="fixed bottom-[50px] left-1/2 -translate-x-1/2 flex flex-col gap-[10px] z-[2147483647] pointer-events-none">
          {toasts.map((toast) => (
            <li
              key={toast.id}
              className="bg-[var(--color-gray-950)] rounded-lg p-4 flex items-center shadow-[var(--shadow-toast)] text-white text-[14px] font-normal"
            >
              <div className="flex-shrink-0 w-4 h-4 mr-3 bg-[var(--color-purple-600)] rounded-full flex items-center justify-center">
                {/* Check icon approx */}
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M10 3L4.5 8.5L2 6"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {toast.message}
            </li>
          ))}
        </ol>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

import { useRef } from "react";
