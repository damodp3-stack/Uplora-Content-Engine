import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IImageGenerationProvider,
  ImageGenerationOptions,
  ImageGenerationOutput,
} from "./image-provider.interface";

@Injectable()
export class OpenAIImageProvider implements IImageGenerationProvider {
  readonly name = "openai";
  private readonly logger = new Logger(OpenAIImageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async getStatus(): Promise<{ status: "AVAILABLE" | "UNAVAILABLE"; message?: string }> {
    const key = this.getApiKey();
    if (!key) {
      return { status: "UNAVAILABLE", message: "OPENAI_API_KEY is not configured" };
    }
    return { status: "AVAILABLE" };
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationOutput> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error("OPENAI_API_KEY is missing. OpenAI image provider generation aborted.");
    }

    const startTime = Date.now();
    const model =
      this.configService.get<string>("OPENAI_IMAGE_MODEL") || "dall-e-3";
    const url = "https://api.openai.com/v1/images/generations";

    // OpenAI DALL-E 3 supports vertical size 1024x1792 for 9:16 aspect ratio
    const size = options.aspectRatio === "9:16" ? "1024x1792" : "1024x1024";

    this.logger.log(`Initiating OpenAI DALL-E image generation using model: ${model}`);

    try {
      const response = await axios.post(
        url,
        {
          model,
          prompt: options.positivePrompt,
          n: 1,
          size,
          response_format: "b64_json",
          style: "vivid",
        },
        {
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const b64Data = response.data?.data?.[0]?.b64_json;

      if (!b64Data) {
        throw new Error("OpenAI returned empty base64 image payload");
      }

      const buffer = Buffer.from(b64Data, "base64");

      this.logger.log(
        `✅ OpenAI DALL-E image generated successfully (${model}, ${buffer.byteLength} bytes, ${latencyMs}ms)`,
      );

      return {
        buffer,
        mimeType: "image/png",
        provider: this.name,
        model,
        latencyMs,
        requestId: `openai_${Date.now()}`,
        estimatedCostUSD: 0.04,
        retryCount: 0,
        width: options.aspectRatio === "9:16" ? 1024 : 1024,
        height: options.aspectRatio === "9:16" ? 1792 : 1024,
        consistencyMechanism: "prompt_conditioning",
      };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message || err.message || "OpenAI Image API request failed";
      this.logger.error(`❌ OpenAI Image generation error: ${errorMsg}`);
      throw new Error(`OpenAI provider error: ${errorMsg}`);
    }
  }

  private getApiKey(): string | null {
    return (
      this.configService.get<string>("OPENAI_API_KEY") ||
      process.env.OPENAI_API_KEY ||
      null
    );
  }
}
