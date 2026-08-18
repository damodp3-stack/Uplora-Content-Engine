"use client";

import React from "react";
import { ShieldCheck, ShieldAlert, Activity, Volume2, Film, Clock } from "lucide-react";

export interface QualityScoreBadgeProps {
  overallScore: number;
  criticalGatesPassed: boolean;
  isProductionReady: boolean;
  avSyncDeltaMs?: number;
  integratedLufs?: number;
  truePeakDb?: number;
  wpmRate?: number;
}

export const QualityScoreBadge: React.FC<QualityScoreBadgeProps> = ({
  overallScore,
  criticalGatesPassed,
  isProductionReady,
  avSyncDeltaMs = 9,
  integratedLufs = -16.0,
  truePeakDb = -0.5,
  wpmRate = 145,
}) => {
  const isPass = isProductionReady && overallScore >= 85 && criticalGatesPassed;

  return (
    <div className="glass-card rounded-2xl p-4 border border-purple-500/20 space-y-4">
      {/* Header Badge Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPass ? (
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Quality Gate Certificate</span>
              <span
                className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${
                  isPass
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                    : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                }`}
              >
                {isPass ? "Production Ready" : "Gate Failed"}
              </span>
            </h4>
            <p className="text-xs text-gray-400">Dual-Gate Quality Gate & EBU R128 Compliance</p>
          </div>
        </div>

        {/* 100-Point Score Circle */}
        <div className="text-right">
          <div className="text-xl font-black text-white">{overallScore} / 100</div>
          <span className="text-[10px] text-purple-400 font-semibold uppercase">Overall QC Score</span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
        <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-1">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>A/V Sync Delta</span>
          </div>
          <div className="font-bold text-white">{avSyncDeltaMs} ms <span className="text-[10px] font-normal text-emerald-400">(Limit &le;50ms)</span></div>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-1">
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            <span>EBU R128 LUFS</span>
          </div>
          <div className="font-bold text-white">{integratedLufs} LUFS <span className="text-[10px] font-normal text-emerald-400">(&plusmn;0.5)</span></div>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-1">
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span>True Peak</span>
          </div>
          <div className="font-bold text-white">{truePeakDb} dBFS <span className="text-[10px] font-normal text-emerald-400">(&le;-0.5)</span></div>
        </div>

        <div className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800">
          <div className="flex items-center gap-1 text-gray-400 text-[11px] mb-1">
            <Film className="w-3.5 h-3.5 text-blue-400" />
            <span>WPM Rate</span>
          </div>
          <div className="font-bold text-white">{wpmRate} WPM <span className="text-[10px] font-normal text-emerald-400">(130-160)</span></div>
        </div>
      </div>
    </div>
  );
};
