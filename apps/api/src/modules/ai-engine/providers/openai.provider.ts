import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IAIProvider,
  ProviderHealth,
  AIGenerationOutput,
} from "./provider.interface";

@Injectable()
export class OpenAIProvider implements IAIProvider {
  readonly name = "openai";
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly config: ConfigService) {}

  async getStatus(): Promise<ProviderHealth> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        provider: this.name,
        status: "UNAVAILABLE",
        message: "OPENAI_API_KEY is not configured",
      };
    }
    return {
      provider: this.name,
      status: "AVAILABLE",
    };
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2000,
  ): Promise<AIGenerationOutput> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      this.logger.warn("OPENAI_API_KEY is missing. Generation aborted.");
      throw new Error("OPENAI_API_KEY is missing");
    }

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const choice = response.data.choices[0];
      const tokens = response.data.usage?.total_tokens || 200;

      return {
        content: choice.message.content.trim(),
        model: response.data.model || "gpt-4o-mini",
        tokens,
        provider: this.name,
        latencyMs,
        estimatedCostUSD: 0.002,
      };
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error?.message || error.message || "Unknown error";
      this.logger.error(`OpenAI provider error: ${errorMsg}`);
      throw new Error(`OpenAI provider error: ${errorMsg}`);
    }
  }

  private getApiKey(): string | null {
    return (
      this.config.get<string>("OPENAI_API_KEY") ||
      this.config.get<string>("ai.openaiApiKey") ||
      process.env.OPENAI_API_KEY ||
      null
    );
  }
}
