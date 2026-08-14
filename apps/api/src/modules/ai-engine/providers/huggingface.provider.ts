import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IAIProvider,
  ProviderHealth,
  AIGenerationOutput,
} from "./provider.interface";

@Injectable()
export class HuggingFaceProvider implements IAIProvider {
  readonly name = "huggingface";
  private readonly logger = new Logger(HuggingFaceProvider.name);

  constructor(private readonly config: ConfigService) {}

  async getStatus(): Promise<ProviderHealth> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        provider: this.name,
        status: "UNAVAILABLE",
        message: "HUGGINGFACE_API_KEY is not configured",
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
    maxTokens: number = 1000,
  ): Promise<AIGenerationOutput> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    if (!apiKey) {
      this.logger.warn("HUGGINGFACE_API_KEY is missing. Generation aborted.");
      throw new Error("HUGGINGFACE_API_KEY is missing");
    }

    try {
      const response = await axios.post(
        "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
        {
          inputs: `<s>[INST] ${systemPrompt}\n${userPrompt} [/INST]`,
          parameters: { max_new_tokens: maxTokens },
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          timeout: 30000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const generated = response.data[0]?.generated_text || "";
      const content = generated
        .replace(`<s>[INST] ${systemPrompt}\n${userPrompt} [/INST]`, "")
        .trim();

      return {
        content,
        model: "mistralai/Mistral-7B-Instruct-v0.2",
        tokens: 300,
        provider: this.name,
        latencyMs,
        estimatedCostUSD: 0,
      };
    } catch (error: any) {
      this.logger.error(`HuggingFace provider error: ${error.message}`);
      throw new Error(`HuggingFace provider error: ${error.message}`);
    }
  }

  private getApiKey(): string | null {
    return (
      this.config.get<string>("HUGGINGFACE_API_KEY") ||
      this.config.get<string>("ai.huggingfaceApiKey") ||
      process.env.HUGGINGFACE_API_KEY ||
      null
    );
  }
}
