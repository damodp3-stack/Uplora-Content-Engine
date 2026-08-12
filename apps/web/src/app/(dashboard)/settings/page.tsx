"use client";

import React from "react";
import { Settings, Cpu, Key, Database } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="glass-card rounded-2xl p-5 border border-gray-800">
        <h1 className="text-xl font-extrabold text-white">
          Engine Configuration
        </h1>
        <p className="text-xs text-gray-400">
          Configure AI provider API keys, local Ollama models, and database
          credentials
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <Cpu className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-sm text-white">
            Local Ollama Configuration
          </h3>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-400 mb-1">Ollama Base URL</label>
            <input
              type="text"
              defaultValue="http://localhost:11434"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-gray-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">
              Default Model Name
            </label>
            <input
              type="text"
              defaultValue="llama3"
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-gray-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 border border-gray-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <Key className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-sm text-white">
            Cloud AI Provider Keys
          </h3>
        </div>
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-gray-400 mb-1">
              OpenAI API Key (Optional)
            </label>
            <input
              type="password"
              placeholder="sk-proj-..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-gray-200 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">
              HuggingFace Token (Optional)
            </label>
            <input
              type="password"
              placeholder="hf_..."
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-gray-200 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
