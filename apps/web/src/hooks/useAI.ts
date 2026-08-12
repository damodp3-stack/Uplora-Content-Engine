import { useState, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

export interface GenerateRequest {
  prompt: string;
  type: string;
  tone?: string;
  length?: string;
  language?: string;
  targetAudience?: string;
  keywords?: string[];
  platform?: string;
  provider?: 'ollama' | 'huggingface' | 'openai';
  templateVariables?: Record<string, string>;
}

export interface GenerateResponse {
  content: string;
  metadata: {
    provider: string;
    model: string;
    tokensUsed: number;
    generationTime: number;
    cost: number;
    promptVersion: string;
  };
  suggestions: {
    titles: string[];
    hashtags: string[];
    keywords: string[];
    cta: string[];
  };
}

export interface TemplateInfo {
  id: string;
  name: string;
  category: string;
}

export function useAI() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (request: GenerateRequest): Promise<GenerateResponse> => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await axios.post(`${API_BASE}/ai-engine/generate`, request);
      return response.data;
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'AI generation failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const optimizeSEO = useCallback(async (content: string, focusKeyword: string) => {
    try {
      const response = await axios.post(`${API_BASE}/ai-engine/seo-optimize`, { content, focusKeyword });
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'SEO analysis failed');
    }
  }, []);

  const repurpose = useCallback(async (content: string, fromType: string, toTypes: string[]) => {
    try {
      const response = await axios.post(`${API_BASE}/ai-engine/repurpose`, { content, fromType, toTypes });
      return response.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Repurposing failed');
    }
  }, []);

  const getTemplates = useCallback(async (category?: string) => {
    try {
      const params = category ? `?category=${category}` : '';
      const response = await axios.get(`${API_BASE}/ai-engine/templates${params}`);
      return response.data?.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to load templates');
    }
  }, []);

  return {
    generate,
    optimizeSEO,
    repurpose,
    getTemplates,
    isGenerating,
    error,
  };
}
