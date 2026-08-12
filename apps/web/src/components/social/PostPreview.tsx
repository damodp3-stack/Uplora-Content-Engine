"use client";

import React, { useState } from "react";
import {
  Twitter,
  Linkedin,
  Instagram,
  Heart,
  MessageSquare,
  Repeat,
  Send,
} from "lucide-react";

interface PostPreviewProps {
  content: string;
  title: string;
}

export function PostPreview({ content, title }: PostPreviewProps) {
  const [activePlatform, setActivePlatform] = useState<
    "twitter" | "linkedin" | "instagram"
  >("twitter");

  const formattedText =
    content || title || "Your preview message will render here in real-time...";

  return (
    <div className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <h3 className="font-bold text-sm text-white">Live Platform Preview</h3>
        <div className="flex items-center gap-1 bg-gray-900/60 p-1 rounded-xl border border-gray-800">
          <button
            onClick={() => setActivePlatform("twitter")}
            className={`p-1.5 rounded-lg transition-colors ${
              activePlatform === "twitter"
                ? "bg-sky-500/20 text-sky-400 font-bold"
                : "text-gray-400"
            }`}
          >
            <Twitter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActivePlatform("linkedin")}
            className={`p-1.5 rounded-lg transition-colors ${
              activePlatform === "linkedin"
                ? "bg-blue-500/20 text-blue-400 font-bold"
                : "text-gray-400"
            }`}
          >
            <Linkedin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActivePlatform("instagram")}
            className={`p-1.5 rounded-lg transition-colors ${
              activePlatform === "instagram"
                ? "bg-pink-500/20 text-pink-400 font-bold"
                : "text-gray-400"
            }`}
          >
            <Instagram className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Platform Card Rendering */}
      <div className="p-4 rounded-xl bg-gray-950/80 border border-gray-800 flex flex-col gap-3 font-sans text-xs">
        {/* User Card Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white text-xs">
            U
          </div>
          <div>
            <p className="font-bold text-white flex items-center gap-1">
              Uplora Engine{" "}
              <span className="text-purple-400 text-[10px]">✔</span>
            </p>
            <p className="text-[10px] text-gray-500">
              {activePlatform === "twitter"
                ? "@uplora_ai"
                : "Content Marketing AI"}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
          {formattedText.length > 280 && activePlatform === "twitter"
            ? formattedText.substring(0, 275) + "..."
            : formattedText}
        </p>

        {/* Social Metrics Mock Bar */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-gray-500 text-[11px]">
          <div className="flex items-center gap-1 hover:text-pink-400 cursor-pointer">
            <Heart className="w-3.5 h-3.5" /> <span>42</span>
          </div>
          <div className="flex items-center gap-1 hover:text-sky-400 cursor-pointer">
            <MessageSquare className="w-3.5 h-3.5" /> <span>12</span>
          </div>
          <div className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer">
            <Repeat className="w-3.5 h-3.5" /> <span>8</span>
          </div>
          <div className="flex items-center gap-1 hover:text-purple-400 cursor-pointer">
            <Send className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
