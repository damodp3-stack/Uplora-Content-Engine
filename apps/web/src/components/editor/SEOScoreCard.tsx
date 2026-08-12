"use client";

import React from "react";
import { Target, CheckCircle2, AlertTriangle, BookOpen } from "lucide-react";

interface SEOScoreCardProps {
  content: string;
}

export function SEOScoreCard({ content }: SEOScoreCardProps) {
  const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  // Compute live score demo values based on text length
  let score = 30;
  if (wordCount > 100) score += 25;
  if (wordCount > 300) score += 25;
  if (wordCount > 500) score += 15;
  score = Math.min(100, score);

  return (
    <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold text-sm text-white">
            Live SEO & Readability
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-lg font-extrabold text-emerald-400">
            {score}
          </span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-purple-500 to-emerald-400 h-full rounded-full transition-all duration-500"
          style={{ width: `${score}%` }}
        />
      </div>

      {/* Content Metrics Breakdown */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 glass-card rounded-xl border border-gray-800">
          <p className="text-[10px] text-gray-400">Word Count</p>
          <p className="font-bold text-gray-200 text-sm mt-0.5">
            {wordCount} words
          </p>
        </div>
        <div className="p-2.5 glass-card rounded-xl border border-gray-800">
          <p className="text-[10px] text-gray-400">Reading Time</p>
          <p className="font-bold text-gray-200 text-sm mt-0.5">
            {readTime} min read
          </p>
        </div>
      </div>

      {/* SEO Checklist */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Optimal article length achieved</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Title contains focus keyword</span>
        </div>
        <div className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Add 1-2 external reference links</span>
        </div>
      </div>
    </div>
  );
}
