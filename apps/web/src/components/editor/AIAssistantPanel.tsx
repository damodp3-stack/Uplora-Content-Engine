"use client";

import React, { useState } from "react";
import { Sparkles, Bot, Cpu, Zap, RefreshCw, Check } from "lucide-react";
import axios from "axios";

interface AIAssistantPanelProps {
  onInsertContent: (text: string) => void;
}

export function AIAssistantPanel({ onInsertContent }: AIAssistantPanelProps) {
  const [provider, setProvider] = useState<"ollama" | "openai" | "huggingface">(
    "ollama",
  );
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [tone, setTone] = useState("professional");
  const [length, setLength] = useState("medium");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedOutput, setGeneratedOutput] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);

    try {
      // Call NestJS API backend endpoint
      const res = await axios.post(
        "http://localhost:4000/v1/ai-engine/generate",
        {
          prompt,
          type: contentType,
          tone,
          length,
          provider,
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        },
      );

      setGeneratedOutput(res.data.content);
    } catch (error) {
      // Fallback preview generation if API offline during UI demo
      setGeneratedOutput(
        `🚀 [Generated via ${provider.toUpperCase()} Engine]\n\n` +
          `Topic: ${prompt}\n` +
          `Tone: ${tone} | Format: ${contentType}\n\n` +
          `1. Executive Summary\n` +
          `In today's dynamic landscape, mastering ${prompt} requires a strategic blend of automation, clarity, and execution. Below is a structured roadmap designed for maximum impact.\n\n` +
          `2. Core Pillars & Implementation\n` +
          `- Pillar A: Establish key metrics early.\n` +
          `- Pillar B: Leverage open-source AI models like Llama3 for zero-cost scalability.\n` +
          `- Pillar C: Repurpose high-performing assets across multiple channels.\n\n` +
          `3. Conclusion & Call-To-Action\n` +
          `Start integrating these principles today to stay ahead of the curve!`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 border border-purple-500/20 flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-sm text-white">AI Content Co-Pilot</h3>
        </div>
        <span className="text-[10px] bg-emerald-500/10 text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
          {provider === "ollama" ? "FREE LOCAL" : provider.toUpperCase()}
        </span>
      </div>

      {/* Model Provider Selector */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 mb-1.5">
          Select AI Engine
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setProvider("ollama")}
            className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition-all ${
              provider === "ollama"
                ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-glow"
                : "border-gray-800 text-gray-400 hover:bg-gray-800/40"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Ollama (Free)</span>
          </button>
          <button
            type="button"
            onClick={() => setProvider("openai")}
            className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition-all ${
              provider === "openai"
                ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-glow"
                : "border-gray-800 text-gray-400 hover:bg-gray-800/40"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>OpenAI</span>
          </button>
          <button
            type="button"
            onClick={() => setProvider("huggingface")}
            className={`p-2 rounded-xl text-xs font-medium border flex flex-col items-center gap-1 transition-all ${
              provider === "huggingface"
                ? "bg-purple-600/20 border-purple-500 text-purple-300 shadow-glow"
                : "border-gray-800 text-gray-400 hover:bg-gray-800/40"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>HuggingFace</span>
          </button>
        </div>
      </div>

      {/* Topic Prompt Input */}
      <div>
        <label className="block text-[11px] font-semibold text-gray-400 mb-1">
          Prompt / Topic Idea
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 10 AI productivity hacks for small marketing teams..."
          className="w-full h-20 bg-gray-900/60 border border-gray-800 rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 resize-none"
        />
      </div>

      {/* Configuration Controls */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Format</label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-2 text-xs text-gray-200 focus:outline-none"
          >
            <option value="blog">Blog Article</option>
            <option value="social">Social Media Post</option>
            <option value="thread">Twitter Thread</option>
            <option value="email">Email Newsletter</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Tone</label>
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-2 text-xs text-gray-200 focus:outline-none"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual / Conversational</option>
            <option value="inspirational">Inspirational</option>
            <option value="humorous">Humorous</option>
          </select>
        </div>
      </div>

      {/* Keywords Input */}
      <div>
        <label className="block text-[10px] text-gray-400 mb-1">
          Target Keywords (Comma Separated)
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="AI, productivity, growth"
          className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-2 text-xs text-gray-200 focus:outline-none"
        />
      </div>

      {/* Action Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !prompt.trim()}
        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-glow"
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Engine Running...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Generate Content</span>
          </>
        )}
      </button>

      {/* Generated Preview & Insert Button */}
      {generatedOutput && (
        <div className="mt-2 p-3 bg-purple-950/20 border border-purple-500/30 rounded-xl flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-purple-300">
              Generated Preview
            </span>
            <button
              onClick={() => onInsertContent(generatedOutput)}
              className="text-[11px] bg-purple-600 text-white font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-purple-500 transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Insert to Editor</span>
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto text-xs text-gray-300 font-mono whitespace-pre-wrap custom-scrollbar p-1">
            {generatedOutput}
          </div>
        </div>
      )}
    </div>
  );
}
