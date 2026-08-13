import React from "react";

// Segmented tabs primitive
type Tab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
};

type TabsProps = {
  tabs: Tab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
};

export function Tabs({ tabs, activeId, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex border-b border-[var(--color-gray-200)] ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`pb-3 -mb-[1px] text-[14px] font-medium border-b-2 transition-colors flex items-center gap-2 px-4 ${
              isActive
                ? "text-[var(--color-purple-700)] border-[var(--color-purple-600)]"
                : "text-[var(--color-gray-500)] border-transparent hover:text-[var(--color-gray-700)] hover:border-[var(--color-gray-300)]"
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`px-1.5 py-0.5 rounded-full text-[12px] font-medium ${isActive ? "bg-[var(--color-purple-50)] text-[var(--color-purple-700)]" : "bg-[var(--color-gray-100)] text-[var(--color-gray-500)]"}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
