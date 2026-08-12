"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  Calendar,
  BarChart3,
  FolderOpen,
  LayoutTemplate,
  Settings,
  Share2,
  Zap,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Content Library", href: "/content", icon: FileText },
  { name: "AI Writer", href: "/content/create", icon: Sparkles, badge: "FREE" },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Media Assets", href: "/media", icon: FolderOpen },
  { name: "AI Templates", href: "/templates", icon: LayoutTemplate },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 glass-panel border-r border-gray-800 flex flex-col justify-between p-4 h-screen sticky top-0">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-gray-800/60">
          <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-glow">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide">
              UPLORA
            </h1>
            <p className="text-xs text-purple-400 font-medium">
              Content Engine v1.0
            </p>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="px-3 py-2 mb-6 glass-card rounded-xl flex items-center justify-between text-xs text-gray-300 cursor-pointer">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-gray-200">Main Workspace</span>
          </div>
          <span className="text-gray-500">▼</span>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-gray-400"}`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full font-bold border border-purple-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* AI Model Status Footer */}
      <div className="glass-card rounded-xl p-3 border border-purple-500/20">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Active Engine</span>
          <span className="text-emerald-400 font-bold flex items-center gap-1">
            ● Ollama / Llama3
          </span>
        </div>
        <p className="text-[11px] text-gray-500">
          100% Free Unlimited Local Generation
        </p>
      </div>
    </aside>
  );
}
