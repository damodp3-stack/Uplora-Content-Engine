"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Shield,
  Cpu,
  Share2,
  BarChart3,
  ArrowRight,
  Check,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col justify-between selection:bg-purple-500 selection:text-white">
      {/* Top Navigation Bar */}
      <nav className="h-20 max-w-7xl mx-auto w-full px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <span className="font-extrabold text-xl tracking-wider text-white">
            UPLORA
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-glow hover:scale-105"
          >
            <span>Launch Free Studio</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-purple-500/30 text-purple-300 text-xs font-bold shadow-glow">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>1000x Open-Source AI Content Engine</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Supercharge Content Creation with{" "}
          <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Zero API Costs
          </span>
        </h1>

        <p className="text-sm sm:text-base text-gray-400 max-w-2xl leading-relaxed">
          The world’s first free, open-source content engine powered by NestJS,
          Next.js 14, local Ollama Llama3 AI models, real-time SEO scoring,
          visual drag & drop scheduling, and multi-channel publishing.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-4">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm px-8 py-3.5 rounded-2xl transition-all shadow-glow hover:scale-105"
          >
            <span>Get Started for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto flex items-center justify-center gap-2 glass-card hover:bg-gray-800 text-gray-200 font-bold text-sm px-8 py-3.5 rounded-2xl transition-all border border-gray-800"
          >
            <span>Star on GitHub ⭐</span>
          </a>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left w-full">
          <div className="glass-card rounded-2xl p-6 border border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              Free Local AI Models
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Connect to local Ollama endpoints or HuggingFace models for
              unlimited generation with zero per-token subscription costs.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              Multi-Channel Publishing
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Repurpose longform articles into Twitter threads, LinkedIn
              stories, and Instagram captions with instant live previews.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-gray-800">
            <div className="w-10 h-10 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center mb-4 border border-pink-500/20">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">
              Real-Time SEO Optimizer
            </h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Analyze keyword density, readability scores, and heading hierarchy
              live as you write in the studio editor.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 py-8 text-center text-xs text-gray-500">
        <p>© 2026 Uplora Content Engine. Open-Source under MIT License.</p>
      </footer>
    </div>
  );
}
