"use client";

import React, { useState } from "react";
import { Download, X, Play, Pause, Share2, Sparkles, CheckCircle2 } from "lucide-react";
import { QualityScoreBadge } from "./QualityScoreBadge";

export interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  videoUrl: string;
  downloadUrl: string;
  overallScore: number;
  criticalGatesPassed: boolean;
  isProductionReady: boolean;
  avSyncDeltaMs?: number;
  integratedLufs?: number;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  isOpen,
  onClose,
  title,
  videoUrl,
  downloadUrl,
  overallScore,
  criticalGatesPassed,
  isProductionReady,
  avSyncDeltaMs = 9,
  integratedLufs = -16.0,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExportDownload = () => {
    setIsExporting(true);
    // Trigger physical browser download via direct media endpoint
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `uplora_reel_30s_${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
      setExportedSuccess(true);
      setTimeout(() => setExportedSuccess(false), 4000);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl glass-card border border-purple-500/30 rounded-3xl p-6 shadow-2xl space-y-6">
        {/* Modal Header Bar */}
        <div className="flex items-center justify-between border-b border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="text-xs text-gray-400">Vertical 9:16 H.264 Mastered Video Reel</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass-card hover:bg-gray-800 text-gray-400 hover:text-white transition-all border border-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Grid (Left: 9:16 Player, Right: QC Badge & Export Actions) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
          {/* Vertical 9:16 Video Canvas (2/5 Cols) */}
          <div className="md:col-span-2 flex justify-center">
            <div className="relative w-[270px] h-[480px] bg-gray-950 rounded-2xl overflow-hidden border-2 border-purple-500/40 shadow-glow group">
              <video
                src={videoUrl}
                controls
                className="w-full h-full object-cover"
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            </div>
          </div>

          {/* QC Badge & Download Actions (3/5 Cols) */}
          <div className="md:col-span-3 space-y-6">
            <QualityScoreBadge
              overallScore={overallScore}
              criticalGatesPassed={criticalGatesPassed}
              isProductionReady={isProductionReady}
              avSyncDeltaMs={avSyncDeltaMs}
              integratedLufs={integratedLufs}
            />

            {/* One-Click Export Actions */}
            <div className="glass-card rounded-2xl p-5 border border-gray-800 space-y-4">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-purple-400" />
                <span>Export & Publish Studio</span>
              </h4>
              <p className="text-xs text-gray-400">
                Download the physical 9:16 MP4 video reel directly for Instagram Reels, YouTube Shorts, or TikTok.
              </p>

              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  onClick={handleExportDownload}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all shadow-glow text-sm disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isExporting ? "Preparing Export..." : "Download 9:16 MP4 Reel"}</span>
                </button>
              </div>

              {exportedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>MP4 Video Reel downloaded successfully!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
