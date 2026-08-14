import React from "react";

type NavItem = {
  label: string;
  active?: boolean;
};

type PlaceholderPageProps = {
  title: string;
  navGroups: { title?: string; items: NavItem[] }[];
  description?: string;
};

export function PlaceholderPage({ title, navGroups, description }: PlaceholderPageProps) {
  return (
    <div className="flex h-full bg-[var(--color-background)]">
      {/* Left sub-sidebar (~235px) */}
      <div className="w-[235px] border-r border-[var(--color-gray-200)] flex-shrink-0 bg-white">
        <div className="p-4">
          <h2 className="text-[18px] font-medium text-[var(--color-gray-900)] mb-6">{title}</h2>
          
          <div className="flex flex-col gap-6">
            {navGroups.map((group, i) => (
              <div key={i}>
                {group.title && (
                  <div className="text-[12px] font-medium text-[var(--color-gray-500)] mb-2 px-3 uppercase tracking-wider">
                    {group.title}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  {group.items.map((item, j) => (
                    <div 
                      key={j} 
                      className={`text-[14px] font-medium px-3 py-2 rounded-md ${
                        item.active 
                          ? "text-[var(--color-purple-700)] bg-[var(--color-purple-50)]" 
                          : "text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] cursor-not-allowed opacity-70"
                      }`}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-8 bg-[var(--color-background)]">
        <div className="max-w-[789px] mx-auto">
          <h1 className="text-[18px] font-medium text-[var(--color-gray-900)] mb-6">{navGroups.flatMap(g => g.items).find(i => i.active)?.label || title}</h1>
          
          <div className="bg-white border border-[var(--color-gray-200)] rounded-lg p-5 flex items-center gap-4 opacity-70">
             <div className="w-10 h-10 rounded-full bg-[var(--color-gray-100)] flex items-center justify-center flex-shrink-0">
               <svg className="text-[var(--color-gray-400)]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
             </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-[var(--color-gray-900)]">Coming Soon</div>
              <div className="text-[14px] text-[#667085] mt-1">
                {description || "This feature is not yet available in the current version."}
              </div>
            </div>
            
            {/* Visibly inert control (disabled toggle) */}
            <div className="w-9 h-5 bg-[var(--color-gray-200)] rounded-full relative cursor-not-allowed">
              <div className="w-4 h-4 bg-white rounded-full absolute left-0.5 top-0.5 shadow-sm"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
