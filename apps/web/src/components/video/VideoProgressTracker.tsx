"use client";

import React from "react";
import { Sparkles, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

export interface ProgressStage {
  id: string;
  label: string;
  percent: number;
}

export interface VideoProgressTrackerProps {
  currentStage: string;
  progressPercent: number;
  isSelfHealing?: boolean;
  selfHealingAttempt?: number;
  errorWarning?: string;
}

const STAGES: ProgressStage[] = [
  { id: "SCRIPTING", label: "Creative Scripting", percent: 15 },
  { id: "IMAGE_GEN", label: "Pollinations 9:16 Keyframes", percent: 35 },
  { id: "VIDEO_MOTION", label: "FFmpeg Motion Synthesis", percent: 55 },
  { id: "TTS_NARRATION", label: "Edge Neural TTS Voice", percent: 75 },
  { id: "AUDIO_MASTERING", label: "EBU R128 Audio Master", percent: 88 },
  { id: "QUALITY_CHECK", label: "Dual-Gate QC & Frame Sync", percent: 100 },
];

export const VideoProgressTracker: React.FC<VideoProgressTrackerProps> = ({
  currentStage,
  progressPercent,
  isSelfHealing = false,
  selfHealingAttempt = 0,
  errorWarning,
}) => {
  return (
    <div className="glass-card rounded-2xl p-6 border border-purple-500/20 space-y-6">
      {/* Tracker Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>AI Reel Generation Engine</span>
              {isSelfHealing && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Self-Healing (Attempt {selfHealingAttempt}/3)
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-400">
              Autonomous 30s vertical reel synthesis & EBU R128 audio mastering
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Main Progress Bar */}
      <div className="w-full bg-gray-950 rounded-full h-3 p-0.5 border border-gray-800 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 rounded-full transition-all duration-500 shadow-glow"
          style={{ width: `${Math.max(5, progressPercent)}%` }}
        />
      </div>

      {/* Active Stage Indicator Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2">
        {STAGES.map((s) => {
          const isDone = progressPercent >= s.percent;
          const isCurrent = currentStage === s.id || (progressPercent < s.percent && progressPercent >= (s.percent - 20));

          return (
            <div
              key={s.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                isDone
                  ? "bg-purple-950/30 border-purple-500/40 text-purple-300"
                  : isCurrent
                  ? "bg-indigo-900/40 border-indigo-500 text-white font-semibold ring-1 ring-indigo-500/50"
                  : "bg-gray-900/40 border-gray-800 text-gray-500"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                {isDone ? (
                  <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                ) : isCurrent ? (
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-gray-700" />
                )}
                <span className="truncate">{s.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Warning Alert Banner */}
      {errorWarning && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{errorWarning}</span>
        </div>
      )}
    </div>
  );
};
