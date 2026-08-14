import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GeminiProvider } from "./providers/gemini.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { HuggingFaceProvider } from "./providers/huggingface.provider";
import { PromptEngineService } from "./prompt-engine.service";
import {
  IAIProvider,
  ProviderHealth,
  AIGenerationOutput,
} from "./providers/provider.interface";

export interface AIGenerationRequest {
  prompt: string;
  type: string;
  tone?: string;
  length?: string;
  language?: string;
  targetAudience?: string;
  keywords?: string[];
  platform?: string;
  provider?: "gemini" | "openai" | "ollama" | "huggingface";
  maxTokens?: number;
  templateVariables?: Record<string, string>;
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
    isMock: boolean;
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
  private readonly providerRegistry: Map<string, IAIProvider> = new Map();

  constructor(
    private readonly config: ConfigService,
    private readonly promptEngine: PromptEngineService,
    private readonly geminiProvider: GeminiProvider,
    private readonly openaiProvider: OpenAIProvider,
    private readonly ollamaProvider: OllamaProvider,
    private readonly huggingfaceProvider: HuggingFaceProvider,
  ) {
    this.providerRegistry.set("gemini", this.geminiProvider);
    this.providerRegistry.set("openai", this.openaiProvider);
    this.providerRegistry.set("ollama", this.ollamaProvider);
  }

  async getProviderStatuses(): Promise<ProviderHealth[]> {
    const statuses: ProviderHealth[] = [];
    for (const [_, provider] of this.providerRegistry) {
      try {
        const health = await provider.getStatus();
        statuses.push(health);
      } catch (err) {
        statuses.push({
          provider: provider.name,
          status: "ERROR",
          message: (err as Error).message,
        });
      }
    }
    return statuses;
  }

  async generateContent(
    request: AIGenerationRequest,
  ): Promise<AIGenerationResponse> {
    const startTime = Date.now();

    const built = this.promptEngine.build(request.type, {
      topic: request.prompt,
      prompt: request.prompt,
      tone: request.tone || "professional",
      language: request.language || "English",
      target_audience: request.targetAudience || "general",
      platform: request.platform || "general",
      keywords: (request.keywords || []).join(", "),
      ...(request.templateVariables || {}),
    });

    const preferredProviderName =
      request.provider ||
      this.config.get<string>("AI_DEFAULT_PROVIDER") ||
      this.config.get<string>("ai.defaultProvider") ||
      "gemini";

    // Determine execution order (preferred provider first, followed by remaining registered providers)
    const providerOrder = this.getProviderExecutionOrder(preferredProviderName);

    let result: AIGenerationOutput | null = null;
    let lastError: Error | null = null;

    for (const providerName of providerOrder) {
      const provider = this.providerRegistry.get(providerName);
      if (!provider) continue;

      const health = await provider.getStatus();
      if (health.status !== "AVAILABLE") {
        this.logger.log(
          `Skipping provider [${providerName}] (Status: ${health.status}${health.message ? ` - ${health.message}` : ""})`,
        );
        continue;
      }

      try {
        this.logger.log(`Attempting generation via provider [${providerName}]...`);
        result = await provider.generate(
          built.systemPrompt,
          built.userPrompt,
          request.maxTokens,
        );
        break; // Generation succeeded
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `Provider [${providerName}] failed: ${lastError.message}. Trying next available provider...`,
        );
      }
    }

    if (!result) {
      const statuses = await this.getProviderStatuses();
      const statusSummary = statuses
        .map((s) => `${s.provider}: ${s.status}`)
        .join(", ");
      this.logger.error(
        `All AI providers failed or are UNAVAILABLE. (${statusSummary})`,
      );
      throw new ServiceUnavailableException(
        `No AI provider is available to process request. Configure GEMINI_API_KEY or OPENAI_API_KEY. Provider Statuses: [${statusSummary}]`,
      );
    }

    const suggestions = await this.generateSuggestions(result.content, request);

    return {
      content: result.content,
      metadata: {
        provider: result.provider,
        model: result.model,
        tokensUsed: result.tokens,
        generationTime: Date.now() - startTime,
        cost: result.estimatedCostUSD,
        promptVersion: this.promptEngine.getVersion(),
        isMock: false,
      },
      suggestions,
    };
  }

  async optimizeSEO(content: string, focusKeyword: string) {
    const wordCount = content.split(/\s+/).filter(Boolean).length;
    const lowerContent = content.toLowerCase();
    const lowerKey = focusKeyword.toLowerCase();
    const keywordMatches = (lowerContent.match(new RegExp(lowerKey, "g")) || [])
      .length;
    const keywordDensity =
      wordCount > 0 ? (keywordMatches / wordCount) * 100 : 0;

    let score = 50;
    if (keywordDensity >= 1 && keywordDensity <= 3) score += 25;
    if (content.length > 500) score += 15;
    if (content.includes("#") || content.includes("<h2>")) score += 10;

    return {
      score: Math.min(score, 100),
      metaTitle: `${focusKeyword} - Complete Guide & Insights`,
      metaDescription: content.substring(0, 155).replace(/[\r\n]+/g, " "),
      keywordDensity: Math.round(keywordDensity * 100) / 100,
      readabilityScore: 82,
      issues:
        keywordDensity < 1
          ? ["Focus keyword density is low (aim for 1-2.5%)"]
          : [],
      suggestions: [
        "Add relevant subheadings (H2, H3) containing key terms",
        "Ensure key term appears in the first 100 words",
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
      if (toType === "twitter" || toType === "thread") {
        results[toType] =
          `🧵 THREAD: Key takeaways from our latest post on ${fromType}:\n\n1/ ${content.substring(0, 150)}...\n\n2/ High impact implementation tips.\n\n3/ What are your thoughts? 👇 #Productivity`;
      } else if (toType === "linkedin") {
        results[toType] =
          `🚀 Repurposed Insights:\n\n${content.substring(0, 400)}\n\nWhat has been your experience with this? Let's discuss in the comments below.`;
      } else {
        results[toType] =
          `[${toType.toUpperCase()} FORMAT]\n${content.substring(0, 300)}...`;
      }
    }

    return results;
  }

  private getProviderExecutionOrder(preferred: string): string[] {
    const allProviders = ["gemini", "openai", "ollama"];
    const normalizedPref = preferred.toLowerCase();
    if (allProviders.includes(normalizedPref)) {
      return [
        normalizedPref,
        ...allProviders.filter((p) => p !== normalizedPref),
      ];
    }
    return allProviders;
  }

  private async generateSuggestions(
    content: string,
    request: AIGenerationRequest,
  ) {
    return {
      titles: [
        `Mastering ${request.prompt}: The Ultimate Blueprint`,
        `10 Proven Strategies for ${request.prompt}`,
        `Why ${request.prompt} is Changing Content Creation in 2026`,
      ],
      hashtags: [
        "#ContentMarketing",
        "#AIWriter",
        "#DigitalStrategy",
        "#Uplora",
      ],
      keywords: request.keywords || ["growth", "strategy", "innovation"],
      cta: [
        "Subscribe to our newsletter!",
        "Share your thoughts below!",
        "Try Uplora Content Engine today!",
      ],
    };
  }
}
