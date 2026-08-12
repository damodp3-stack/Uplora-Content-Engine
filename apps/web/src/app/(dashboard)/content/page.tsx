"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Filter,
  FileText,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit3,
  Trash2,
} from "lucide-react";

const mockContentList = [
  {
    id: "1",
    title: "10 AI Productivity Hacks for 2026",
    type: "blog_post",
    status: "draft",
    seoScore: 88,
    wordCount: 650,
    updatedAt: "2026-08-11",
    tags: ["AI", "Productivity"],
  },
  {
    id: "2",
    title: "Visual Content Scheduling Guide",
    type: "social_post",
    status: "scheduled",
    seoScore: 92,
    wordCount: 320,
    updatedAt: "2026-08-10",
    tags: ["Social", "Growth"],
  },
  {
    id: "3",
    title: "Multi-Channel Publishing Overview",
    type: "newsletter",
    status: "published",
    seoScore: 95,
    wordCount: 1200,
    updatedAt: "2026-08-08",
    tags: ["Newsletter", "Marketing"],
  },
];

export default function ContentLibraryPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = mockContentList.filter((item) =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-5 border border-gray-800">
        <div>
          <h1 className="text-xl font-extrabold text-white">Content Library</h1>
          <p className="text-xs text-gray-400">
            Manage all your articles, social posts, and draft variants
          </p>
        </div>
        <Link
          href="/content/create"
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-glow"
        >
          <Plus className="w-4 h-4" />
          <span>New Content</span>
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search content by title, tags..."
            className="w-full bg-gray-900/60 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>
        <button className="flex items-center gap-1.5 glass-card px-3 py-2 rounded-xl text-xs text-gray-300 border border-gray-800">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters</span>
        </button>
      </div>

      {/* Content Table */}
      <div className="glass-card rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-xs text-gray-300">
          <thead className="bg-gray-900/60 text-gray-400 font-semibold border-b border-gray-800">
            <tr>
              <th className="p-4">Title</th>
              <th className="p-4">Type</th>
              <th className="p-4">Status</th>
              <th className="p-4">SEO Score</th>
              <th className="p-4">Words</th>
              <th className="p-4">Updated</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {filtered.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-800/30 transition-colors"
              >
                <td className="p-4 font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{item.title}</span>
                </td>
                <td className="p-4 capitalize text-gray-400">
                  {item.type.replace("_", " ")}
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      item.status === "published"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : item.status === "scheduled"
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                          : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
                <td className="p-4 font-bold text-emerald-400">
                  {item.seoScore}/100
                </td>
                <td className="p-4 text-gray-400">{item.wordCount}</td>
                <td className="p-4 text-gray-400">{item.updatedAt}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2 text-gray-400">
                    <Link
                      href="/content/create"
                      className="hover:text-purple-400 p-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </Link>
                    <button className="hover:text-rose-400 p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
