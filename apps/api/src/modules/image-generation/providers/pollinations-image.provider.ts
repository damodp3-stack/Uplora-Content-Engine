import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import {
  IImageGenerationProvider,
  ImageGenerationOptions,
  ImageGenerationOutput,
} from "./image-provider.interface";

@Injectable()
export class PollinationsImageProvider implements IImageGenerationProvider {
  readonly name = "pollinations";
  private readonly logger = new Logger(PollinationsImageProvider.name);

  // In-process mutex lock to guarantee anonymous request concurrency = 1
  private executionQueue: Promise<any> = Promise.resolve();

  constructor(private readonly configService: ConfigService) {}

  async getStatus(): Promise<{
    status: "AVAILABLE" | "UNAVAILABLE";
    message?: string;
  }> {
    // Zero-auth provider: Always AVAILABLE without API credentials
    return { status: "AVAILABLE" };
  }

  async generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationOutput> {
    // Enforce strict in-process concurrency = 1 (sequential queue execution)
    return new Promise((resolve, reject) => {
      this.executionQueue = this.executionQueue
        .then(() => this.executeSingleGeneration(options))
        .then(resolve)
        .catch(reject);
    });
  }

  private async executeSingleGeneration(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationOutput> {
    const startTime = Date.now();
    const width = options.width || 576;
    const height = options.height || 1024;
    const model =
      this.configService.get<string>("POLLINATIONS_MODEL") || "flux";
    const seed = options.seed || Math.floor(Math.random() * 1000000);

    // Format prompt using ImagePromptBuilderService output
    const promptText = options.positivePrompt || options.prompt;
    const encodedPrompt = encodeURIComponent(promptText);

    const baseUrl =
      this.configService.get<string>("POLLINATIONS_API_URL") ||
      "https://image.pollinations.ai/prompt";

    const url = `${baseUrl}/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${seed}`;

    this.logger.log(
      `Initiating Pollinations image generation [model=${model}, ${width}x${height}, seed=${seed}]`,
    );

    const maxRetries = 3;
    let attempt = 0;
    let lastError: any = null;

    while (attempt <= maxRetries) {
      if (attempt > 0) {
        const backoffMs =
          process.env.NODE_ENV === "test"
            ? 10
            : Math.pow(2, attempt) * 2000; // 4s, 8s, 16s
        this.logger.warn(
          `Retry attempt ${attempt}/${maxRetries} for Pollinations API in ${backoffMs}ms...`,
        );
        await new Promise((r) => setTimeout(r, backoffMs));
      }

      try {
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          headers: {
            "User-Agent": "UploraContentEngine/1.0",
          },
          timeout: 45000,
        });

        const latencyMs = Date.now() - startTime;
        const contentType = String(
          response.headers["content-type"] || "image/jpeg",
        );

        if (response.status !== 200) {
          throw new Error(
            `Pollinations API returned non-200 status: ${response.status}`,
          );
        }

        const buffer = Buffer.from(response.data);
        if (buffer.byteLength === 0) {
          throw new Error("Pollinations API returned empty 0-byte payload");
        }

        // Validate image magic numbers
        const detectedMime = this.detectMimeType(buffer);
        if (detectedMime === "unknown" && !contentType.startsWith("image/")) {
          throw new Error(
            `Pollinations API returned invalid non-image payload: ${contentType}`,
          );
        }

        const finalMime: string =
          detectedMime !== "unknown" ? detectedMime : contentType;

        this.logger.log(
          `✅ Pollinations image generated successfully (${model}, ${buffer.byteLength} bytes, ${latencyMs}ms, attempt=${attempt + 1})`,
        );

        return {
          buffer,
          mimeType: finalMime,
          provider: this.name,
          model,
          latencyMs,
          requestId: `pollinations_img_${Date.now()}`,
          estimatedCostUSD: 0,
          retryCount: attempt,
          width,
          height,
          seed,
          consistencyMechanism: "prompt_conditioning_plus_style_rules",
        };
      } catch (err: any) {
        lastError = err;
        const statusCode = err.response?.status;
        const errorMsg =
          err.response?.data ? Buffer.from(err.response.data).toString("utf-8").substring(0, 200) : err.message;

        if (statusCode === 429) {
          this.logger.warn(
            `⚠️ Pollinations API rate limited (HTTP 429): ${errorMsg}`,
          );
        } else if (statusCode >= 500) {
          this.logger.warn(
            `⚠️ Pollinations API server error (HTTP ${statusCode}): ${errorMsg}`,
          );
        } else {
          // Client or fatal error, do not retry
          this.logger.error(
            `❌ Pollinations image generation error: ${errorMsg}`,
          );
          throw new Error(`Pollinations provider error: ${errorMsg}`);
        }

        attempt++;
      }
    }

    const finalMsg = lastError?.response?.status === 429
      ? "Pollinations API rate limited (HTTP 429) after maximum retries"
      : lastError?.message || "Pollinations request failed after retries";

    this.logger.error(`❌ Pollinations provider exhausted retries: ${finalMsg}`);
    throw new Error(`Pollinations provider error: ${finalMsg}`);
  }

  private detectMimeType(buffer: Buffer): string {
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return "image/png";
    }
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return "image/jpeg";
    }
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return "image/webp";
    }
    return "unknown";
  }
}
