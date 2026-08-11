'use client';

import React from 'react';
import { EngagementChart } from '@/components/analytics/EngagementChart';
import { BarChart3, TrendingUp, Share2, Eye, Award } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5 border border-gray-800 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white">Performance Analytics</h1>
          <p className="text-xs text-gray-400">Track reach, channel breakdown, and top-performing content</p>
        </div>
      </div>

      <EngagementChart />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-5 border border-gray-800">
          <h3 className="font-bold text-sm text-white mb-4">Platform Reach Comparison</h3>
          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>LinkedIn</span>
                <span className="font-bold">42.5K views</span>
              </div>
              <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full w-[85%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Twitter / X</span>
                <span className="font-bold">38.2K views</span>
              </div>
              <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full rounded-full w-[70%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-gray-300 mb-1">
                <span>Blog Articles</span>
                <span className="font-bold">28.4K views</span>
              </div>
              <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full w-[55%]" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-gray-800">
          <h3 className="font-bold text-sm text-white mb-4">Top Performing Asset</h3>
          <div className="p-4 glass-panel rounded-xl border border-purple-500/30 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white">10 AI Productivity Hacks for 2026</h4>
              <p className="text-xs text-gray-400 mt-1">45.2K Impressions • 3.4K Engagements</p>
              <span className="inline-block mt-2 text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                Top 1% Conversion Rate
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
