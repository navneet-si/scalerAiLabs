"use client";
import React, { useEffect, useState } from "react";
import { RightChatBot } from "@/components/library/RightChatBot";
import { api } from "@/lib/api";
import { ParticipantRead, MeetingListItem } from "@/lib/types";
import Link from "next/link";
import { formatMs } from "@/lib/time";

export default function Home() {
  const [user, setUser] = useState<ParticipantRead | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<MeetingListItem[]>([]);

  useEffect(() => {
    api.getMe().then(setUser).catch(console.error);
    api.getMeetings({ limit: 3 }).then(res => setRecentMeetings(res.items)).catch(console.error);
  }, []);

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-[#EBF4FF] via-white to-[#FFF0F5]">
      {/* Left Main Content */}
      <div className="flex-1 overflow-auto flex flex-col items-center">
        <div className="w-full max-w-[900px] px-8 py-10">
          
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-[28px] font-medium text-[var(--color-gray-900)] tracking-tight">
              Good Morning, {user?.name?.split(" ")[0].toUpperCase() || "NAVNEET"} 🌤️
            </h1>
            <button className="flex items-center gap-2 text-[14px] text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
              Feedback
            </button>
          </div>

          {/* Personal Assistant Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-gray-600)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"></path></svg>
              Personal Assistant
              <svg className="text-[var(--color-gray-400)] cursor-pointer" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>
            <div className="w-10 h-6 bg-[var(--color-gray-900)] rounded-full flex items-center justify-end px-1 cursor-pointer relative shadow-sm">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 shadow-sm"></div>
            </div>
          </div>

          {/* 3 Cards */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 border border-[var(--color-gray-200)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-500 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg>
              </div>
              <h3 className="font-semibold text-[15px] text-[var(--color-gray-900)] mb-1">Daily Brief</h3>
              <p className="text-[13px] text-[var(--color-gray-400)]">No brief yet</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 border border-[var(--color-gray-200)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-400 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              </div>
              <h3 className="font-semibold text-[15px] text-[var(--color-gray-900)] mb-1">Meeting Prep</h3>
              <p className="text-[13px] text-[var(--color-gray-400)]">No upcoming meetings</p>
            </div>
            <div className="bg-white/80 backdrop-blur-md rounded-xl p-5 border border-[var(--color-gray-200)] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow cursor-pointer">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-500 mb-4">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
              </div>
              <h3 className="font-semibold text-[15px] text-[var(--color-gray-900)] mb-1">Tasks</h3>
              <p className="text-[13px] text-[var(--color-gray-400)]">0 New tasks</p>
            </div>
          </div>

          {/* Banner */}
          <div className="bg-[#F8F9FE] rounded-xl p-5 flex items-center justify-between border border-[#E9EDFA] mb-10 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                 <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-[var(--color-gray-200)] shadow-sm z-10">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-[var(--color-gray-200)] shadow-sm">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                 </div>
              </div>
              <p className="text-[14px] text-[var(--color-gray-700)]">
                <span className="font-semibold text-[var(--color-gray-900)]">Connect Slack and Email</span> — get richer insights with full context.
              </p>
            </div>
            <button className="text-[14px] font-medium text-[var(--color-purple-600)] flex items-center gap-1 hover:text-[var(--color-purple-700)] transition-colors">
              Connect
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--color-gray-200)] mb-4">
            <div className="flex gap-6">
              <button className="pb-3 border-b-2 border-[var(--color-gray-900)] text-[14px] font-medium text-[var(--color-gray-900)]">
                Recent
              </button>
              <button className="pb-3 text-[14px] font-medium text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]">
                Upcoming
              </button>
              <button className="pb-3 text-[14px] font-medium text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)]">
                AI Feed
              </button>
            </div>
            <button className="flex items-center gap-2 pb-3 text-[13px] text-[var(--color-gray-500)] hover:text-[var(--color-gray-700)] font-medium">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Settings
            </button>
          </div>

          {/* List */}
          <div className="flex flex-col gap-1">
            {recentMeetings.length > 0 ? (
              recentMeetings.map(m => (
                <div key={m.id} className="flex items-start gap-4 p-3 hover:bg-[var(--color-gray-50)] rounded-lg group cursor-pointer transition-colors">
                  <div className="w-10 h-10 shrink-0 bg-[var(--color-gray-100)] rounded flex items-center justify-center font-medium text-[var(--color-gray-600)] text-[14px]">
                    {m.title.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/notebook/${m.id}`} className="block">
                      <h4 className="text-[14px] font-medium text-[var(--color-gray-900)] mb-1 truncate flex items-center gap-2 group-hover:text-[var(--color-purple-600)]">
                        {m.title}
                        <svg className="opacity-0 group-hover:opacity-100 transition-opacity" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
                      </h4>
                    </Link>
                    <p className="text-[12px] text-[var(--color-gray-500)] flex items-center gap-1">
                      {new Date(m.meeting_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric'})}
                      <span className="w-1 h-1 rounded-full bg-[var(--color-gray-300)]"></span>
                      {new Date(m.meeting_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10">
                <p className="text-[14px] text-[var(--color-gray-500)]">No recent meetings</p>
              </div>
            )}
          </div>

        </div>
      </div>

      <RightChatBot />
    </div>
  );
}
