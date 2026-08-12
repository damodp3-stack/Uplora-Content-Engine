"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  FileText,
  Calendar,
  BarChart3,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Zap,
} from "lucide-react";
import { EngagementChart } from "@/components/analytics/EngagementChart";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="glass-card rounded-2xl p-6 border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-gray-900/40 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-semibold mb-3 border border-purple-500/30">
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span>100% Free Open-Source Content Engine</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome back to Uplora Content Studio
            </h1>
            <p className="text-xs text-gray-300 max-w-xl mt-1 leading-relaxed">
              Generate AI copy with local Ollama models, optimize SEO scores,
              schedule visual calendar posts, and publish multi-platform content
              with zero cost.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/content/create"
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-glow hover:scale-105"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch AI Writer</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Total Articles</p>
            <p className="text-2xl font-extrabold text-white mt-1">42</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="w-3 h-3" /> +12 this month
            </p>
          </div>
          <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Published Posts</p>
            <p className="text-2xl font-extrabold text-white mt-1">28</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> 100% On Time
            </p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Scheduled Queue</p>
            <p className="text-2xl font-extrabold text-white mt-1">8</p>
            <p className="text-[11px] text-purple-400 flex items-center gap-1 mt-1 font-semibold">
              <Clock className="w-3 h-3" /> Next in 2h
            </p>
          </div>
          <div className="p-3 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/20">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">
              Total Engagement
            </p>
            <p className="text-2xl font-extrabold text-white mt-1">154.9K</p>
            <p className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
              <TrendingUp className="w-3 h-3" /> +24.8% growth
            </p>
          </div>
          <div className="p-3 rounded-xl bg-pink-600/20 text-pink-400 border border-pink-500/20">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Grid: Chart + Recent Drafts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <EngagementChart />
        </div>

        {/* Quick Recent Activity */}
        <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h3 className="font-bold text-sm text-white">Recent Drafts</h3>
            <Link
              href="/content"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
            >
              View All <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-3">
            <div className="p-3 glass-panel rounded-xl border border-gray-800 hover:border-purple-500/40 transition-colors flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[180px]">
                  10 AI Hacks for Productivity
                </p>
                <p className="text-[10px] text-gray-400">
                  Updated 10m ago • Draft
                </p>
              </div>
              <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                SEO 88
              </span>
            </div>

            <div className="p-3 glass-panel rounded-xl border border-gray-800 hover:border-purple-500/40 transition-colors flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[180px]">
                  LinkedIn Thought Leadership
                </p>
                <p className="text-[10px] text-gray-400">
                  Updated 1h ago • Scheduled
                </p>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Scheduled
              </span>
            </div>

            <div className="p-3 glass-panel rounded-xl border border-gray-800 hover:border-purple-500/40 transition-colors flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white truncate max-w-[180px]">
                  Weekly Growth Newsletter
                </p>
                <p className="text-[10px] text-gray-400">
                  Updated 4h ago • Published
                </p>
              </div>
              <span className="text-[10px] bg-sky-500/20 text-sky-300 font-bold px-2 py-0.5 rounded-full border border-sky-500/30">
                Published
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
