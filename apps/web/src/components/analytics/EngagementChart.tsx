'use client';

import React from 'react';
import { TrendingUp, Users, Share2, Eye } from 'lucide-react';

export function EngagementChart() {
  const chartPoints = [
    { label: 'Week 1', value: 45 },
    { label: 'Week 2', value: 62 },
    { label: 'Week 3', value: 88 },
    { label: 'Week 4', value: 120 },
  ];

  return (
    <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base text-white">Audience Reach Growth</h3>
          <p className="text-xs text-gray-400">Total impressions and engagement over 30 days</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/20 font-bold">
          <TrendingUp className="w-4 h-4" />
          <span>+24.8%</span>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 glass-panel rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-purple-400 text-xs font-semibold mb-1">
            <Eye className="w-4 h-4" />
            <span>Total Views</span>
          </div>
          <p className="text-xl font-extrabold text-white">142.5K</p>
        </div>
        <div className="p-4 glass-panel rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-pink-400 text-xs font-semibold mb-1">
            <Share2 className="w-4 h-4" />
            <span>Shares & Retweets</span>
          </div>
          <p className="text-xl font-extrabold text-white">12.4K</p>
        </div>
        <div className="p-4 glass-panel rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold mb-1">
            <Users className="w-4 h-4" />
            <span>Engagement Rate</span>
          </div>
          <p className="text-xl font-extrabold text-white">8.6%</p>
        </div>
      </div>

      {/* Visual Chart Graphic */}
      <div className="h-48 flex items-end justify-between gap-4 pt-8 px-4 border-b border-gray-800">
        {chartPoints.map((pt, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="w-full bg-gray-900 rounded-t-xl overflow-hidden h-36 flex items-end">
              <div
                className="w-full bg-gradient-to-t from-purple-600 to-indigo-500 rounded-t-xl transition-all duration-700 group-hover:from-purple-500 group-hover:to-pink-500 shadow-glow"
                style={{ height: `${(pt.value / 120) * 100}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-400 font-medium">{pt.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
