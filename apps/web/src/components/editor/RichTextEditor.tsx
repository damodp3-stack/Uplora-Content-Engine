'use client';

import React, { useState } from 'react';
import { Bold, Italic, List, Heading1, Heading2, Quote, Link as LinkIcon, Sparkles } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
}

export function RichTextEditor({ value, onChange, title, onTitleChange }: RichTextEditorProps) {
  return (
    <div className="glass-card rounded-2xl p-6 border border-gray-800 flex flex-col gap-4">
      {/* Document Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Enter Document Title..."
        className="w-full bg-transparent text-2xl font-bold text-white placeholder-gray-600 focus:outline-none border-b border-gray-800/80 pb-3"
      />

      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 border-b border-gray-800 pb-3 text-gray-400">
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="Bold">
          <Bold className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="Italic">
          <Italic className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-gray-800 mx-1"></div>
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="Heading 1">
          <Heading1 className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="Heading 2">
          <Heading2 className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-gray-800 mx-1"></div>
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="List">
          <List className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="Quote">
          <Quote className="w-4 h-4" />
        </button>
        <button className="p-1.5 rounded-lg hover:bg-gray-800 hover:text-white transition-colors" title="Insert Link">
          <LinkIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Textarea Editor Area */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start writing or use the AI panel to generate full content..."
        className="w-full h-[450px] bg-transparent text-gray-200 text-sm leading-relaxed placeholder-gray-600 focus:outline-none resize-none custom-scrollbar font-mono"
      />
    </div>
  );
}
