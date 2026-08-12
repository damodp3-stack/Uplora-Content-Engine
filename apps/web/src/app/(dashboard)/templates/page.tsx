"use client";

import React from "react";
import Link from "next/link";
import { LayoutTemplate, Sparkles, ArrowRight } from "lucide-react";

const prebuiltTemplates = [
  {
    id: "1",
    title: "Viral Twitter Thread Blueprint",
    category: "Social Media",
    description:
      "7-tweet high-converting narrative thread framework with hooks and CTAs.",
  },
  {
    id: "2",
    title: "SEO Pillar Article Framework",
    category: "Blogging",
    description:
      "2000-word structured SEO article with H2s, H3s, and keyword placement.",
  },
  {
    id: "3",
    title: "LinkedIn Thought Leadership",
    category: "Social Media",
    description:
      "Engaging narrative format designed for professional personal branding.",
  },
  {
    id: "4",
    title: "Product Launch Announcement",
    category: "Email & Copy",
    description:
      "High-impact product update email copy with key feature highlights.",
  },
];

export default function TemplatesPage() {
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5 border border-gray-800">
        <h1 className="text-xl font-extrabold text-white">
          AI Content Templates
        </h1>
        <p className="text-xs text-gray-400">
          Pre-configured prompts for high-converting social, blog, and email
          formats
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {prebuiltTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="glass-card rounded-2xl p-5 border border-gray-800 flex flex-col justify-between gap-4 hover:border-purple-500/40 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30">
                  {tmpl.category}
                </span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-bold text-base text-white">{tmpl.title}</h3>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                {tmpl.description}
              </p>
            </div>
            <Link
              href="/content/create"
              className="flex items-center justify-between text-xs font-semibold text-purple-300 bg-purple-950/40 hover:bg-purple-900/60 p-2.5 rounded-xl border border-purple-500/20 transition-colors"
            >
              <span>Use Template</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
