import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IAIProvider,
  ProviderHealth,
  AIGenerationOutput,
} from "./provider.interface";

@Injectable()
export class OllamaProvider implements IAIProvider {
  readonly name = "ollama";
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly config: ConfigService) {}

  async getStatus(): Promise<ProviderHealth> {
    const baseUrl =
      this.config.get<string>("ai.ollamaBaseUrl") ||
      this.config.get<string>("OLLAMA_BASE_URL") ||
      "http://localhost:11434";
    try {
      await axios.get(`${baseUrl}/api/tags`, { timeout: 2000 });
      return {
        provider: this.name,
        status: "AVAILABLE",
      };
    } catch {
      return {
        provider: this.name,
        status: "UNAVAILABLE",
        message: `Ollama daemon unreachable at ${baseUrl}`,
      };
    }
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2000,
  ): Promise<AIGenerationOutput> {
    const startTime = Date.now();
    const baseUrl =
      this.config.get<string>("ai.ollamaBaseUrl") ||
      this.config.get<string>("OLLAMA_BASE_URL") ||
      "http://localhost:11434";
    const model =
      this.config.get<string>("ai.ollamaModel") ||
      this.config.get<string>("OLLAMA_MODEL") ||
      "llama3";

    try {
      const response = await axios.post(
        `${baseUrl}/api/generate`,
        {
          model,
          prompt: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
          stream: false,
          options: {
            num_predict: maxTokens,
          },
        },
        { timeout: 30000 },
      );

      const latencyMs = Date.now() - startTime;
      const tokens = response.data?.eval_count || 150;

      return {
        content: response.data.response.trim(),
        model: `ollama/${model}`,
        tokens,
        provider: this.name,
        latencyMs,
        estimatedCostUSD: 0,
      };
    } catch (error: any) {
      this.logger.warn(`Ollama provider unavailable at ${baseUrl}: ${error.message}`);
      throw new Error(`Ollama provider error: ${error.message}`);
    }
  }
}
