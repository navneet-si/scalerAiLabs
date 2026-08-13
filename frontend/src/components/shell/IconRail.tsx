"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// The narrow far-left rail (icon-only nav, logo top, help bottom, ~53-65px wide)
export function IconRail() {
  const pathname = usePathname();

  const isNotebook = pathname?.startsWith("/notebook") || pathname === "/";
  const isTeam = pathname?.startsWith("/team");
  const isSettings = pathname?.startsWith("/settings");

  const NavItem = ({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) => (
    <Link
      href={href}
      className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
        active
          ? "bg-[var(--color-purple-50)] text-[var(--color-purple-700)]"
          : "text-[var(--color-gray-500)] hover:bg-[var(--color-gray-50)] hover:text-[var(--color-gray-700)]"
      }`}
    >
      {children}
    </Link>
  );

  return (
    <div className="flex flex-col items-center w-[60px] flex-shrink-0 border-r border-[var(--color-gray-200)] bg-white py-4 gap-4 h-full">
      {/* Logo Placeholder */}
      <Link href="/" className="w-8 h-8 bg-[var(--color-purple-600)] rounded-full flex items-center justify-center text-white font-medium text-[14px] mb-2">
        ff
      </Link>
      
      {/* Primary Nav */}
      <div className="flex flex-col gap-2 flex-grow">
        <NavItem active={isNotebook} href="/notebook">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        </NavItem>
        <NavItem active={isTeam} href="/team">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </NavItem>
        <NavItem active={isSettings} href="/settings">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
        </NavItem>
      </div>

      {/* Help Bottom */}
      <NavItem active={false} href="#">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
      </NavItem>
    </div>
  );
}
