'use client';

import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Twitter, Linkedin, Instagram, FileText } from 'lucide-react';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const sampleEvents = [
  { id: '1', date: 5, title: '10 AI Hacks Thread', type: 'twitter', status: 'published' },
  { id: '2', date: 12, title: 'SEO Pillars Post', type: 'blog', status: 'scheduled' },
  { id: '3', date: 15, title: 'Productivity Carousel', type: 'instagram', status: 'scheduled' },
  { id: '4', date: 22, title: 'Industry Insights Story', type: 'linkedin', status: 'draft' },
];

export function ContentCalendar() {
  const [currentMonth, setCurrentMonth] = useState('August 2026');

  return (
    <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col gap-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white">{currentMonth}</h2>
            <p className="text-xs text-gray-400">Drag and drop scheduled posts</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 glass-card rounded-xl text-gray-400 hover:text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button className="p-2 glass-card rounded-xl text-gray-400 hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-all shadow-glow">
            <Plus className="w-3.5 h-3.5" />
            <span>Schedule Post</span>
          </button>
        </div>
      </div>

      {/* Grid Days Header */}
      <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 border-b border-gray-800 pb-2">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 31 }).map((_, idx) => {
          const dayNum = idx + 1;
          const dayEvents = sampleEvents.filter((ev) => ev.date === dayNum);

          return (
            <div
              key={dayNum}
              className="h-28 glass-panel rounded-xl p-2 flex flex-col justify-between border border-gray-800/60 hover:border-purple-500/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${dayNum === 11 ? 'text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded-md' : 'text-gray-400'}`}>
                  {dayNum}
                </span>
                <button className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white text-xs transition-opacity">
                  +
                </button>
              </div>

              {/* Event Cards */}
              <div className="space-y-1 overflow-y-auto custom-scrollbar">
                {dayEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className={`p-1.5 rounded-lg text-[10px] font-semibold border flex items-center gap-1 truncate ${
                      ev.status === 'published'
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : ev.status === 'scheduled'
                        ? 'bg-purple-950/30 border-purple-500/30 text-purple-300'
                        : 'bg-gray-800/40 border-gray-700 text-gray-300'
                    }`}
                  >
                    {ev.type === 'twitter' && <Twitter className="w-3 h-3 text-sky-400 shrink-0" />}
                    {ev.type === 'linkedin' && <Linkedin className="w-3 h-3 text-blue-400 shrink-0" />}
                    {ev.type === 'instagram' && <Instagram className="w-3 h-3 text-pink-400 shrink-0" />}
                    {ev.type === 'blog' && <FileText className="w-3 h-3 text-purple-400 shrink-0" />}
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
