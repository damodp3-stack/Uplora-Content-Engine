import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IImageGenerationProvider,
  ImageGenerationOptions,
  ImageGenerationOutput,
} from "./image-provider.interface";

@Injectable()
export class FalImageProvider implements IImageGenerationProvider {
  readonly name = "fal";
  private readonly logger = new Logger(FalImageProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async getStatus(): Promise<{ status: "AVAILABLE" | "UNAVAILABLE"; message?: string }> {
    const key = this.getApiKey();
    if (!key) {
      return { status: "UNAVAILABLE", message: "FAL_KEY is not configured" };
    }
    return { status: "AVAILABLE" };
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationOutput> {
    const key = this.getApiKey();
    if (!key) {
      throw new Error("FAL_KEY is missing. Fal.ai provider generation aborted.");
    }

    const startTime = Date.now();
    const model =
      this.configService.get<string>("FAL_IMAGE_MODEL") || "fal-ai/flux/schnell";
    const url = `https://fal.run/${model}`;

    this.logger.log(`Initiating Fal.ai Flux image generation using model: ${model}`);

    try {
      const response = await axios.post(
        url,
        {
          prompt: options.positivePrompt,
          negative_prompt: options.negativePrompt,
          image_size: {
            width: options.width || 768,
            height: options.height || 1344,
          },
          num_inference_steps: 4,
          seed: options.seed,
          sync_mode: true,
        },
        {
          headers: {
            Authorization: `Key ${key}`,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        },
      );

      const latencyMs = Date.now() - startTime;
      const images = response.data?.images || [];
      const imageUrl = images[0]?.url;

      if (!imageUrl) {
        throw new Error("Fal.ai returned invalid image generation response");
      }

      // Download binary image output
      const imageResponse = await axios.get(imageUrl, {
        responseType: "arraybuffer",
        timeout: 15000,
      });

      const buffer = Buffer.from(imageResponse.data);
      const rawContentType = imageResponse.headers["content-type"];
      const mimeType = typeof rawContentType === "string" ? rawContentType : "image/jpeg";

      this.logger.log(
        `✅ Fal.ai image generated successfully (${model}, ${buffer.byteLength} bytes, ${latencyMs}ms)`,
      );

      return {
        buffer,
        mimeType,
        provider: this.name,
        model,
        latencyMs,
        requestId: String(response.headers["x-request-id"] || `fal_${Date.now()}`),
        estimatedCostUSD: 0.003,
        retryCount: 0,
        width: options.width,
        height: options.height,
        seed: options.seed || Math.floor(Math.random() * 1000000),
        consistencyMechanism: options.characterIdentity
          ? "prompt_conditioning_plus_seed"
          : "prompt_conditioning",
      };
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.detail || err.message || "Fal.ai API request failed";
      this.logger.error(`❌ Fal.ai generation error: ${errorMsg}`);
      throw new Error(`Fal.ai provider error: ${errorMsg}`);
    }
  }

  private getApiKey(): string | null {
    return (
      this.configService.get<string>("FAL_KEY") ||
      this.configService.get<string>("FAL_API_KEY") ||
      process.env.FAL_KEY ||
      null
    );
  }
}
