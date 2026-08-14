"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isHome = pathname === "/";
  const isNotebook = pathname?.startsWith("/notebook");
  const isTeam = pathname?.startsWith("/team");
  const isSettings = pathname?.startsWith("/settings");
  const isUpload = pathname?.startsWith("/upload");
  const isAskFred = pathname?.startsWith("/askfred");

  const checkActive = (href: string) => {
    if (href === "/") return isHome;
    if (href === "/notebook") return isNotebook;
    if (href === "/team") return isTeam;
    if (href === "/settings") return isSettings;
    if (href === "/upload") return isUpload;
    if (href === "/askfred") return isAskFred;
    return pathname === href;
  };

  const navItems = [
    { label: "Home", href: "/", icon: <HomeIcon /> },
    { label: "AskFred", href: "/askfred", icon: <RobotIcon />, shortcut: "Ctrl + J" },
    { label: "Meetings", href: "/notebook", icon: <VideoIcon /> },
    { label: "Meeting Status", href: "/coming-soon", icon: <PulseIcon /> },
    { label: "Uploads", href: "/upload", icon: <UploadIcon /> },
    { divider: true },
    { label: "Integrations", href: "/coming-soon", icon: <LayersIcon /> },
    { label: "Analytics", href: "/coming-soon", icon: <ChartIcon /> },
    { divider: true },
    { label: "Voice Agents", href: "/coming-soon", icon: <BotIcon />, badge: "NEW" },
    { label: "AI Skills", href: "/coming-soon", icon: <SparklesIcon /> },
    { divider: true },
    { label: "Team", href: "/team", icon: <UsersIcon /> },
    { label: "Upgrade", href: "/coming-soon", icon: <StarIcon /> },
    { label: "Settings", href: "/settings", icon: <GearIcon /> },
    { label: "... More", href: "/coming-soon", icon: <MoreIcon /> },
  ];

  return (
    <div
      className={`flex flex-col flex-shrink-0 border-r border-[var(--color-gray-200)] bg-white transition-all duration-300 ${
        isCollapsed ? "w-[72px]" : "w-[240px]"
      } h-full relative group`}
    >
      {/* Collapse Toggle Button (only when expanded) */}
      {!isCollapsed && (
        <button
          onClick={() => setIsCollapsed(true)}
          className="absolute right-2 top-[26px] w-6 h-6 flex items-center justify-center text-[var(--color-gray-400)] hover:text-black hover:bg-[var(--color-gray-100)] rounded transition-all opacity-0 group-hover:opacity-100 z-10"
          title="Close sidebar"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      )}

      {/* Header / Logo */}
      <div className={`flex items-center h-[60px] px-4 mt-2 ${isCollapsed ? "justify-center" : ""}`}>
        {isCollapsed ? (
          <button 
            onClick={() => setIsCollapsed(false)}
            className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-[#e72b6b] rounded group/logo hover:opacity-90 transition-opacity"
            title="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white" className="block group-hover/logo:hidden">
              <path d="M7 4h4v4H7zM13 4h4v4h-4zM7 10h4v4H7zM13 10h4v10h-4z" />
            </svg>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden group-hover/logo:block">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        ) : (
          <Link href="/" className="flex items-center gap-2 overflow-hidden whitespace-nowrap outline-none">
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 bg-[#e72b6b] rounded">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                <path d="M7 4h4v4H7zM13 4h4v4h-4zM7 10h4v4H7zM13 10h4v10h-4z" />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">fireflies.ai</span>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col px-3 gap-1">
          {navItems.map((item, index) => {
            if (item.divider) {
              return <div key={`div-${index}`} className="my-2 border-t border-[var(--color-gray-100)] mx-2" />;
            }
            const active = checkActive(item.href || "");
            return (
              <Link
                key={item.label}
                href={item.href || "#"}
                className={`flex items-center rounded-md px-3 h-10 transition-colors cursor-pointer group ${
                  active
                    ? "bg-[var(--color-purple-50)] text-[var(--color-purple-700)]"
                    : "text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)]"
                } ${isCollapsed ? "justify-center" : "justify-between"}`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className="flex items-center min-w-0">
                  <div className={`flex-shrink-0 flex items-center justify-center w-5 h-5 ${active ? "text-[var(--color-purple-700)]" : "text-[var(--color-gray-500)] group-hover:text-[var(--color-gray-700)]"}`}>
                    {item.icon}
                  </div>
                  {!isCollapsed && (
                    <span className="ml-3 text-sm font-medium truncate">{item.label}</span>
                  )}
                </div>
                
                {!isCollapsed && (
                  <div className="flex items-center flex-shrink-0 ml-2">
                    {item.badge && (
                      <span className="bg-[#10b981] text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-2">
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <span className="text-xs text-[var(--color-gray-400)]">{item.shortcut}</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer / Privacy */}
      <div className="p-4 mt-auto">
        <Link
          href="/coming-soon"
          className={`flex items-center h-10 px-3 rounded-md text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] hover:bg-[var(--color-gray-50)] transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title={isCollapsed ? "Your Privacy Choices" : undefined}
        >
          <div className="flex-shrink-0 flex items-center justify-center">
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          {!isCollapsed && (
            <span className="ml-3 text-sm font-medium whitespace-nowrap overflow-hidden">Your Privacy Choices</span>
          )}
        </Link>
      </div>
    </div>
  );
}

// Inline SVGs for all icons
const HomeIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>;
const RobotIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/></svg>;
const VideoIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
const PulseIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
const UploadIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const LayersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>;
const ChartIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
const BotIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><path d="M8 16h.01"/><path d="M16 16h.01"/></svg>; // Slightly different robot icon
const SparklesIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"></path></svg>;
const UsersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const StarIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const GearIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const MoreIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>;
