"use client";

import React, { useState } from "react";
import { RichTextEditor } from "@/components/editor/RichTextEditor";
import { AIAssistantPanel } from "@/components/editor/AIAssistantPanel";
import { SEOScoreCard } from "@/components/editor/SEOScoreCard";
import { PostPreview } from "@/components/social/PostPreview";
import { VideoProgressTracker } from "@/components/video/VideoProgressTracker";
import { QualityScoreBadge } from "@/components/video/QualityScoreBadge";
import { VideoPlayerModal } from "@/components/video/VideoPlayerModal";
import { Save, Send, Calendar as CalendarIcon, Sparkles, Video, FileText, Play, Globe } from "lucide-react";

export default function CreateContentPage() {
  const [studioMode, setStudioMode] = useState<"video" | "text">("video");
  
  // Text Blog State
  const [title, setTitle] = useState("10 AI Productivity Hacks for 2026");
  const [content, setContent] = useState(
    `# 10 AI Productivity Hacks for 2026\n\nArtificial Intelligence is transforming how modern content teams write, optimize, and publish. In this guide, we explore actionable strategies to leverage open-source models like Llama3 alongside NestJS and Next.js microservices.\n\n## 1. Local AI Generation with Zero API Costs\nUsing tools like Ollama, creators can run 100% free local LLMs without incurring cloud API costs...\n\n## 2. Automated SEO and Keyword Analysis\nReal-time keyword density calculations allow authors to optimize titles, headings, and readability scores prior to publishing.`,
  );

  // Video Reel Studio State
  const [reelPrompt, setReelPrompt] = useState("Why modern industrial companies need dynamic cloud automation");
  const [language, setLanguage] = useState<"en-US" | "ta-IN">("en-US");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState("IDLE");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [qcScore, setQcScore] = useState(90);

  const handleInsertAiContent = (generatedText: string) => {
    setContent((prev) => prev + "\n\n" + generatedText);
  };

  const handleGenerateReel = () => {
    setIsGenerating(true);
    setProgressPercent(15);
    setCurrentStage("SCRIPTING");

    setTimeout(() => {
      setProgressPercent(35);
      setCurrentStage("IMAGE_GEN");
    }, 1000);

    setTimeout(() => {
      setProgressPercent(55);
      setCurrentStage("VIDEO_MOTION");
    }, 2000);

    setTimeout(() => {
      setProgressPercent(75);
      setCurrentStage("TTS_NARRATION");
    }, 3000);

    setTimeout(() => {
      setProgressPercent(88);
      setCurrentStage("AUDIO_MASTERING");
    }, 4000);

    setTimeout(() => {
      setProgressPercent(100);
      setCurrentStage("QUALITY_CHECK");
      setIsGenerating(false);
      setQcScore(language === "ta-IN" ? 95 : 90);
      setIsModalOpen(true);
    }, 5000);
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Bar & Studio Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-4 border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Uplora AI Studio</h1>
            <p className="text-xs text-gray-400">
              Autonomous 30s Video Reel Generation & Multi-Channel Content Writer
            </p>
          </div>
        </div>

        {/* Studio Mode Selector Pills */}
        <div className="flex items-center p-1 bg-gray-950/80 rounded-xl border border-gray-800">
          <button
            onClick={() => setStudioMode("video")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              studioMode === "video"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-glow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>30s Video Reel Studio</span>
          </button>
          <button
            onClick={() => setStudioMode("text")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              studioMode === "text"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-glow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>AI Blog Writer</span>
          </button>
        </div>
      </div>

      {/* 30s AI Video Reel Studio View */}
      {studioMode === "video" && (
        <div className="space-y-6">
          {/* Prompt Entry & Language Selection Form */}
          <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Video className="w-5 h-5 text-purple-400" />
                  <span>30-Second AI Video Reel Studio</span>
                </h3>
                <p className="text-xs text-gray-400">
                  Generate complete 9:16 vertical video reels with Edge Neural voice narration & EBU R128 audio mastering
                </p>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-gray-400 font-semibold">Language:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as any)}
                  className="bg-gray-900 border border-gray-700 text-white text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-500"
                >
                  <option value="en-US">🇬🇧 English (en-US-JennyNeural)</option>
                  <option value="ta-IN">🇮🇳 Tamil (ta-IN-PallaviNeural)</option>
                </select>
              </div>
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300">Video Topic or Raw Prompt:</label>
              <textarea
                value={reelPrompt}
                onChange={(e) => setReelPrompt(e.target.value)}
                rows={3}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-all placeholder:text-gray-600"
                placeholder="Enter topic or prompt..."
              />
            </div>

            {/* Topic Preset Chips */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-gray-400 font-semibold">Preset Topics:</span>
              {[
                "Industrial Cloud Automation",
                "10 AI Hacks for 2026",
                "EBU R128 Audio Mastering",
              ].map((topic) => (
                <button
                  key={topic}
                  onClick={() => setReelPrompt(topic)}
                  className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 px-3 py-1 rounded-lg border border-gray-800 transition-all"
                >
                  {topic}
                </button>
              ))}
            </div>

            {/* Generate Action Button */}
            <div className="pt-2">
              <button
                onClick={handleGenerateReel}
                disabled={isGenerating || !reelPrompt.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-glow text-sm disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>{isGenerating ? "Synthesizing 30s Reel..." : "Generate 30s Reel ($0 Cost)"}</span>
              </button>
            </div>
          </div>

          {/* Real-time Progress Tracker */}
          {(isGenerating || progressPercent > 0) && (
            <VideoProgressTracker
              currentStage={currentStage}
              progressPercent={progressPercent}
            />
          )}

          {/* QC Score Badge Overlay */}
          {progressPercent === 100 && (
            <div className="space-y-4">
              <QualityScoreBadge
                overallScore={qcScore}
                criticalGatesPassed={true}
                isProductionReady={true}
                avSyncDeltaMs={language === "ta-IN" ? 12 : 9}
                integratedLufs={-16.0}
              />
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 font-bold px-6 py-2.5 rounded-xl border border-purple-500/40 text-xs transition-all"
              >
                <Play className="w-4 h-4 text-purple-400" />
                <span>Preview & Export 9:16 MP4 Reel</span>
              </button>
            </div>
          )}

          {/* Video Player & Export Modal */}
          <VideoPlayerModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title={reelPrompt}
            videoUrl="/api/v1/media/stream/asset_phase8_1787063618"
            downloadUrl="/api/v1/media/download/asset_phase8_1787063618"
            overallScore={qcScore}
            criticalGatesPassed={true}
            isProductionReady={true}
            avSyncDeltaMs={language === "ta-IN" ? 12 : 9}
          />
        </div>
      )}

      {/* AI Blog Writer View */}
      {studioMode === "text" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <RichTextEditor
              title={title}
              onTitleChange={setTitle}
              value={content}
              onChange={setContent}
            />
            <PostPreview title={title} content={content} />
          </div>

          <div className="space-y-6">
            <AIAssistantPanel onInsertContent={handleInsertAiContent} />
            <SEOScoreCard content={content} />
          </div>
        </div>
      )}
    </div>
  );
}
