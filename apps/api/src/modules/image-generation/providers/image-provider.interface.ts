export interface ImageGenerationOptions {
  prompt: string;
  positivePrompt: string;
  negativePrompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  width: number;
  height: number;
  seed?: number;
  referenceImageUrl?: string;
  characterIdentity?: Record<string, any>;
  style?: string;
}

export interface ImageGenerationOutput {
  buffer: Buffer;
  mimeType: string;
  provider: string;
  model: string;
  latencyMs: number;
  requestId?: string;
  estimatedCostUSD?: number;
  retryCount: number;
  width: number;
  height: number;
  seed?: number;
  consistencyMechanism?: string;
}

export interface IImageGenerationProvider {
  readonly name: string;

  generateImage(
    options: ImageGenerationOptions,
  ): Promise<ImageGenerationOutput>;

  getStatus(): Promise<{
    status: "AVAILABLE" | "UNAVAILABLE";
    message?: string;
  }>;
}
