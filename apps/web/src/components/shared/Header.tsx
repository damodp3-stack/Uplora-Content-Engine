"use client";

import React from "react";
import Link from "next/link";
import { Search, Bell, Plus, User, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 glass-panel border-b border-gray-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input */}
      <div className="relative w-72">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search content, tags, keywords... (Cmd+K)"
          className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors"
        />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        <Link
          href="/content/create"
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-glow hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>New AI Draft</span>
        </Link>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl glass-card flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-purple-500"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
          <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-xs">
            U
          </div>
          <div className="hidden sm:block text-left text-xs">
            <p className="font-medium text-gray-200">Creator Account</p>
            <p className="text-[10px] text-gray-400">Pro Open-Source</p>
          </div>
        </div>
      </div>
    </header>
  );
}
