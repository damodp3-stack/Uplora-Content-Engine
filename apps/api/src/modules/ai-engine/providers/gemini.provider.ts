import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IAIProvider,
  ProviderHealth,
  AIGenerationOutput,
} from "./provider.interface";

@Injectable()
export class GeminiProvider implements IAIProvider {
  readonly name = "gemini";
  private readonly logger = new Logger(GeminiProvider.name);

  constructor(private readonly config: ConfigService) {}

  async getStatus(): Promise<ProviderHealth> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return {
        provider: this.name,
        status: "UNAVAILABLE",
        message: "GEMINI_API_KEY is not configured",
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
      this.logger.warn("GEMINI_API_KEY is missing. Generation aborted.");
      throw new Error("GEMINI_API_KEY is missing");
    }

    const primaryModel =
      this.config.get<string>("ai.geminiModel") ||
      this.config.get<string>("GEMINI_MODEL") ||
      "gemini-3.6-flash";

    const candidateModels = [
      primaryModel,
      "gemini-3.5-flash",
      "gemini-flash-latest",
    ].filter((m, i, self) => self.indexOf(m) === i);

    let lastErrorMsg = "";
    let outerAttempt = 0;

    while (outerAttempt < 4) {
      outerAttempt++;

      for (const model of candidateModels) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        try {
          const response = await axios.post(
            url,
            {
              contents: [
                {
                  role: "user",
                  parts: [
                    {
                      text: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                maxOutputTokens: maxTokens,
                temperature: 0.7,
              },
            },
            {
              headers: {
                "Content-Type": "application/json",
              },
              timeout: 90000,
            },
          );

          const latencyMs = Date.now() - startTime;
          const candidate = response.data?.candidates?.[0];

          if (!candidate || !candidate.content?.parts?.[0]?.text) {
            throw new Error("Gemini API returned an empty or malformed response");
          }

          const content = candidate.content.parts[0].text.trim();
          const tokens = response.data?.usageMetadata?.totalTokenCount || 250;

          this.logger.log(
            `✅ Gemini API generated content (${model}, ${tokens} tokens, ${latencyMs}ms)`,
          );

          return {
            content,
            model: `gemini/${model}`,
            tokens,
            provider: this.name,
            latencyMs,
            estimatedCostUSD: 0.0001,
          };
        } catch (error: any) {
          lastErrorMsg =
            error.response?.data?.error?.message || error.message || "Unknown error";

          if (
            lastErrorMsg.includes("high demand") ||
            lastErrorMsg.includes("429") ||
            lastErrorMsg.includes("quota") ||
            lastErrorMsg.includes("rate limit")
          ) {
            this.logger.warn(
              `⚠️ Model [${model}] rate limited: ${lastErrorMsg}. Trying next candidate model...`,
            );
            continue;
          }

          this.logger.error(`Gemini API generation error (${model}): ${lastErrorMsg}`);
          throw new Error(`Gemini provider error: ${lastErrorMsg}`);
        }
      }

      if (outerAttempt < 4) {
        this.logger.warn(
          `⚠️ All candidate Gemini models rate limited (Attempt ${outerAttempt}/4). Waiting 12s for quota reset...`,
        );
        await new Promise((res) => setTimeout(res, 12000));
      }
    }

    throw new Error(`Gemini provider error: ${lastErrorMsg}`);
  }

  private getApiKey(): string | null {
    return (
      this.config.get<string>("GEMINI_API_KEY") ||
      this.config.get<string>("ai.geminiApiKey") ||
      process.env.GEMINI_API_KEY ||
      null
    );
  }
}
