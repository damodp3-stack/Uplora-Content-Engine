import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IImageGenerationProvider,
  ImageGenerationOptions,
  ImageGenerationOutput,
} from "./image-provider.interface";

@Injectable()
export class GeminiImageProvider implements IImageGenerationProvider {
  readonly name = "gemini";
  private readonly logger = new Logger(GeminiImageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async getStatus(): Promise<{
    status: "AVAILABLE" | "UNAVAILABLE";
    message?: string;
  }> {
    const key = this.getApiKey();
    if (!key) {
      return { status: "UNAVAILABLE", message: "GEMINI_API_KEY is not configured" };
    }
    return { status: "AVAILABLE" };
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationOutput> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error("GEMINI_API_KEY is missing. Gemini image generation aborted.");
    }

    const startTime = Date.now();
    const model =
      this.configService.get<string>("GEMINI_IMAGE_MODEL") ||
      "gemini-3.1-flash-image";

    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;

    this.logger.log(
      `Initiating Gemini image generation using model [${model}] for aspect ratio [${options.aspectRatio || "9:16"}]`,
    );

    // Build prompt parts including aspect ratio framing
    const parts: any[] = [
      {
        text: `Generate a 9:16 vertical keyframe image asset (1K resolution): ${options.positivePrompt}`,
      },
    ];

    let consistencyMechanism = "prompt_conditioning_plus_style_rules";

    // Support character reference image input if provided
    if (options.referenceImageUrl && options.referenceImageUrl.startsWith("data:")) {
      const matches = options.referenceImageUrl.match(/^data:(.+);base64,(.+)$/);
      if (matches) {
        parts.unshift({
          inlineData: {
            mimeType: matches[1],
            data: matches[2],
          },
        });
        consistencyMechanism = "character_reference_image";
        this.logger.log("Attached character reference image input part for visual consistency.");
      }
    }

    try {
      const response = await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
          },
        },
        {
          headers: {
            "x-goog-api-key": key,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const candidate = response.data?.candidates?.[0];
      const part = candidate?.content?.parts?.find((p: any) => p.inlineData?.data);
      const b64Data = part?.inlineData?.data;
      const mimeType = part?.inlineData?.mimeType || "image/jpeg";

      if (!b64Data) {
        throw new Error("Gemini API returned an empty or malformed inlineData image response");
      }

      const buffer = Buffer.from(b64Data, "base64");
      const totalTokens = response.data?.usageMetadata?.totalTokenCount || 1024;

      this.logger.log(
        `✅ Gemini image generated successfully (${model}, ${buffer.byteLength} bytes, ${latencyMs}ms, mechanism: ${consistencyMechanism})`,
      );

      return {
        buffer,
        mimeType,
        provider: this.name,
        model,
        latencyMs,
        requestId: `gemini_img_${Date.now()}`,
        estimatedCostUSD: 0.002,
        retryCount: 0,
        width: options.width || 768,
        height: options.height || 1344,
        seed: options.seed || Math.floor(Math.random() * 1000000),
        consistencyMechanism,
      };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message || err.message || "Gemini Image API request failed";

      if (err.response?.status === 429) {
        this.logger.warn(`⚠️ Gemini Image API rate limited (HTTP 429): ${errorMsg}`);
        throw new Error(`Gemini provider rate limited: ${errorMsg}`);
      }

      this.logger.error(`❌ Gemini Image generation error: ${errorMsg}`);
      throw new Error(`Gemini provider error: ${errorMsg}`);
    }
  }

  private getApiKey(): string | null {
    return (
      this.configService.get<string>("GEMINI_API_KEY") ||
      this.configService.get<string>("ai.geminiApiKey") ||
      process.env.GEMINI_API_KEY ||
      null
    );
  }
}
