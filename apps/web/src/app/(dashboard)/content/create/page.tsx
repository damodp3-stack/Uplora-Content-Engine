'use client';

import React, { useState } from 'react';
import { RichTextEditor } from '@/components/editor/RichTextEditor';
import { AIAssistantPanel } from '@/components/editor/AIAssistantPanel';
import { SEOScoreCard } from '@/components/editor/SEOScoreCard';
import { PostPreview } from '@/components/social/PostPreview';
import { Save, Send, Calendar as CalendarIcon, Sparkles } from 'lucide-react';

export default function CreateContentPage() {
  const [title, setTitle] = useState('10 AI Productivity Hacks for 2026');
  const [content, setContent] = useState(
    `# 10 AI Productivity Hacks for 2026\n\nArtificial Intelligence is transforming how modern content teams write, optimize, and publish. In this guide, we explore actionable strategies to leverage open-source models like Llama3 alongside NestJS and Next.js microservices.\n\n## 1. Local AI Generation with Zero API Costs\nUsing tools like Ollama, creators can run 100% free local LLMs without incurring cloud API costs...\n\n## 2. Automated SEO and Keyword Analysis\nReal-time keyword density calculations allow authors to optimize titles, headings, and readability scores prior to publishing.`,
  );

  const handleInsertAiContent = (generatedText: string) => {
    setContent((prev) => prev + '\n\n' + generatedText);
  };

  return (
    <div className="space-y-6">
      {/* Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card rounded-2xl p-4 border border-gray-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">AI Content Writer Studio</h1>
            <p className="text-xs text-gray-400">Draft, optimize SEO, and generate copy with local & cloud AI</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 glass-card hover:bg-gray-800 text-gray-200 text-xs font-semibold px-3 py-2 rounded-xl transition-all border border-gray-700">
            <Save className="w-3.5 h-3.5" />
            <span>Save Draft</span>
          </button>
          <button className="flex items-center gap-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold px-3 py-2 rounded-xl transition-all border border-indigo-500/30">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
          <button className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-glow">
            <Send className="w-3.5 h-3.5" />
            <span>Publish Now</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Editor */}
        <div className="lg:col-span-2 space-y-6">
          <RichTextEditor
            title={title}
            onTitleChange={setTitle}
            value={content}
            onChange={setContent}
          />
          <PostPreview title={title} content={content} />
        </div>

        {/* Right Column: AI Assistant & Live SEO Score */}
        <div className="space-y-6">
          <AIAssistantPanel onInsertContent={handleInsertAiContent} />
          <SEOScoreCard content={content} />
        </div>
      </div>
    </div>
  );
}
