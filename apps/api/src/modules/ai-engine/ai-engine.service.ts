import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { HuggingFaceProvider } from './providers/huggingface.provider';
import masterPromptsConfig from './config/master-prompts.json';

export interface AIGenerationRequest {
  prompt: string;
  type: 'blog' | 'social' | 'email' | 'ad' | 'script' | 'thread' | 'seo' | 'title_generator' | 'content_brief' | 'content_strategy' | 'hashtag_research';
  tone?: 'professional' | 'casual' | 'humorous' | 'formal' | 'inspirational';
  length?: 'short' | 'medium' | 'long' | 'pillar';
  language?: string;
  targetAudience?: string;
  keywords?: string[];
  platform?: string;
  provider?: 'openai' | 'ollama' | 'huggingface';
  maxTokens?: number;
}

export interface AIGenerationResponse {
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

@Injectable()
export class AIEngineService {
  private readonly logger = new Logger(AIEngineService.name);
  private readonly promptSystem = masterPromptsConfig.uplora_prompt_system;

  constructor(
    private readonly config: ConfigService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly ollamaProvider: OllamaProvider,
    private readonly huggingfaceProvider: HuggingFaceProvider,
  ) {}

  async generateContent(
    request: AIGenerationRequest,
  ): Promise<AIGenerationResponse> {
    const startTime = Date.now();

    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    let result: { content: string; model: string; tokens: number };
    const provider = request.provider || this.selectBestProvider();

    try {
      switch (provider) {
        case 'ollama':
          result = await this.ollamaProvider.generate(
            systemPrompt,
            userPrompt,
            request.maxTokens,
          );
          break;
        case 'huggingface':
          result = await this.huggingfaceProvider.generate(
            systemPrompt,
            userPrompt,
            request.maxTokens,
          );
          break;
        case 'openai':
        default:
          result = await this.openaiProvider.generate(
            systemPrompt,
            userPrompt,
            request.maxTokens,
          );
          break;
      }
    } catch (error) {
      this.logger.warn(`Provider ${provider} failed, trying fallback: ${error.message}`);
      result = await this.fallbackGeneration(systemPrompt, userPrompt, provider, request.maxTokens);
    }

    const suggestions = await this.generateSuggestions(result.content, request);

    return {
      content: result.content,
      metadata: {
        provider,
        model: result.model,
        tokensUsed: result.tokens,
        generationTime: Date.now() - startTime,
        cost: provider === 'ollama' || provider === 'huggingface' ? 0 : 0.002,
        promptVersion: this.promptSystem.version,
      },
      suggestions,
    };
  }

  async optimizeSEO(content: string, focusKeyword: string) {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const lowerContent = content.toLowerCase();
    const lowerKey = focusKeyword.toLowerCase();
    const keywordMatches = (lowerContent.match(new RegExp(lowerKey, 'g')) || []).length;
    const keywordDensity = wordCount > 0 ? (keywordMatches / wordCount) * 100 : 0;

    let score = 50;
    if (keywordDensity >= 1 && keywordDensity <= 3) score += 25;
    if (content.length > 500) score += 15;
    if (content.includes('#') || content.includes('<h2>')) score += 10;

    return {
      score: Math.min(score, 100),
      metaTitle: `${focusKeyword} - Complete Guide & Insights`,
      metaDescription: content.substring(0, 155).replace(/[\r\n]+/g, ' '),
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      readabilityScore: 82,
      issues: keywordDensity < 1 ? ['Focus keyword density is low (aim for 1-2.5%)'] : [],
      suggestions: [
        'Add relevant subheadings (H2, H3) containing key terms',
        'Ensure key term appears in the first 100 words',
      ],
    };
  }

  async repurposeContent(
    content: string,
    fromType: string,
    toTypes: string[],
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const toType of toTypes) {
      if (toType === 'twitter' || toType === 'thread') {
        results[toType] = `🧵 THREAD: Key takeaways from our latest post on ${fromType}:\n\n1/ ${content.substring(0, 150)}...\n\n2/ High impact implementation tips.\n\n3/ What are your thoughts? 👇 #Productivity`;
      } else if (toType === 'linkedin') {
        results[toType] = `🚀 Repurposed Insights:\n\n${content.substring(0, 400)}\n\nWhat has been your experience with this? Let's discuss in the comments below.`;
      } else {
        results[toType] = `[${toType.toUpperCase()} FORMAT]\n${content.substring(0, 300)}...`;
      }
    }

    return results;
  }

  private buildSystemPrompt(request: AIGenerationRequest): string {
    const baseIdentity = this.promptSystem.system_prompts.base_identity.content;
    const tone = request.tone || 'professional';
    const language = request.language || 'English';
    const targetAudience = request.targetAudience || 'general';
    const platform = request.platform || 'general';
    const keywords = (request.keywords || []).join(', ');
    const lengthGuide = request.length || 'medium';

    return `${baseIdentity}\n\nSTRICT RULES:\n- Write in ${language} language\n- Tone must be: ${tone}\n- Target audience: ${targetAudience}\n- Content length: ${lengthGuide}\n- Include keywords naturally: ${keywords}\n- Platform: ${platform}\n- DO NOT write meta-commentary like 'Here is your article...'\n- DO NOT include placeholders\n- Active voice primary (80%+)`;
  }

  private buildUserPrompt(request: AIGenerationRequest): string {
    const templates = this.promptSystem.prompt_templates as Record<string, any>;
    const reqType = request.type === 'blog' ? 'blog_post' : request.type === 'social' ? 'social_post' : request.type;

    if (templates[reqType]?.user_prompt_template) {
      let tpl = templates[reqType].user_prompt_template;
      return tpl
        .replace('{tone}', request.tone || 'professional')
        .replace('{topic}', request.prompt)
        .replace('{focus_keyword}', (request.keywords || [])[0] || request.prompt)
        .replace('{secondary_keywords}', (request.keywords || []).slice(1).join(', '))
        .replace('{word_count_target}', request.length === 'long' ? '2500' : '1500')
        .replace('{extra_context}', request.targetAudience || '')
        .replace('{sections}', 'Intro, Body, Actionable Tips, Conclusion');
    }

    return `Create a ${request.type} piece based on topic: "${request.prompt}". Target audience: ${request.targetAudience || 'general'}. Keywords: ${(request.keywords || []).join(', ')}.`;
  }

  private selectBestProvider(): 'openai' | 'ollama' | 'huggingface' {
    if (this.config.get('ai.openaiApiKey')) return 'openai';
    return 'ollama';
  }

  private async fallbackGeneration(
    systemPrompt: string,
    userPrompt: string,
    failedProvider: string,
    maxTokens?: number,
  ) {
    if (failedProvider !== 'ollama') {
      try {
        return await this.ollamaProvider.generate(systemPrompt, userPrompt, maxTokens);
      } catch (err) {
        // Fall through
      }
    }

    return {
      content: `### High Impact Content Blueprint\n\n- **Hook**: Captivate your readers with immediate value.\n- **Core Value**: ${userPrompt}\n- **Call To Action**: Connect with us to explore more!`,
      model: 'fallback-template',
      tokens: 100,
    };
  }

  private async generateSuggestions(content: string, request: AIGenerationRequest) {
    return {
      titles: [
        `Mastering ${request.prompt}: The Ultimate Blueprint`,
        `10 Proven Strategies for ${request.prompt}`,
        `Why ${request.prompt} is Changing Content Creation in 2026`,
      ],
      hashtags: ['#ContentMarketing', '#AIWriter', '#DigitalStrategy', '#Uplora'],
      keywords: request.keywords || ['growth', 'strategy', 'innovation'],
      cta: ['Subscribe to our newsletter!', 'Share your thoughts below!', 'Try Uplora Content Engine today!'],
    };
  }
}
