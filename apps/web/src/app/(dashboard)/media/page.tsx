"use client";

import React from "react";
import { FolderOpen, Upload, Image as ImageIcon } from "lucide-react";

const sampleMedia = [
  {
    id: "1",
    title: "Banner-AI.png",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    size: "1.4 MB",
  },
  {
    id: "2",
    title: "Infographic-2026.png",
    url: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    size: "2.1 MB",
  },
  {
    id: "3",
    title: "Header-Bg.jpg",
    url: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    size: "980 KB",
  },
];

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-5 border border-gray-800">
        <div>
          <h1 className="text-xl font-extrabold text-white">Media Library</h1>
          <p className="text-xs text-gray-400">
            Store and manage images, banners, and video assets
          </p>
        </div>
        <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-glow">
          <Upload className="w-4 h-4" />
          <span>Upload Asset</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {sampleMedia.map((item) => (
          <div
            key={item.id}
            className="glass-card rounded-2xl overflow-hidden border border-gray-800 group hover:border-purple-500/40 transition-colors"
          >
            <div className="h-40 overflow-hidden relative">
              <img
                src={item.url}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="p-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-white truncate max-w-[140px]">
                  {item.title}
                </p>
                <p className="text-[10px] text-gray-400">{item.size}</p>
              </div>
              <button className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-2.5 py-1 rounded-lg border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors">
                Insert
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
