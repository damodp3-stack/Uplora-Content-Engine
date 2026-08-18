import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImagePromptBuilderService, ShotPromptInput } from "./image-prompt-builder.service";
import { ImageQualityValidatorService } from "./image-quality-validator.service";
import { GeminiImageProvider } from "./providers/gemini-image.provider";
import { FalImageProvider } from "./providers/fal-image.provider";
import { OpenAIImageProvider } from "./providers/openai-image.provider";
import { PollinationsImageProvider } from "./providers/pollinations-image.provider";
import { IImageGenerationProvider, ImageGenerationOutput } from "./providers/image-provider.interface";
import { MediaService } from "../media/media.service";
import { MediaAsset, AssetType, AssetStatus } from "../media/entities/media-asset.entity";
import { CollaborationGateway } from "../realtime/collaboration.gateway";

export interface KeyframeGenerationRequest {
  workspaceId: string;
  projectId: string;
  shotId: string;
  shotPromptInput: ShotPromptInput;
}

@Injectable()
export class ImageGenerationService {
  private readonly logger = new Logger(ImageGenerationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly promptBuilder: ImagePromptBuilderService,
    private readonly qualityValidator: ImageQualityValidatorService,
    private readonly geminiImageProvider: GeminiImageProvider,
    private readonly falProvider: FalImageProvider,
    private readonly openaiProvider: OpenAIImageProvider,
    private readonly pollinationsProvider: PollinationsImageProvider,
    private readonly mediaService: MediaService,
    private readonly gateway: CollaborationGateway,
  ) {}

  async getActiveProvider(): Promise<IImageGenerationProvider> {
    const preferred = (
      this.configService.get<string>("IMAGE_GENERATION_PROVIDER") || "pollinations"
    ).toLowerCase();

    if (preferred === "pollinations") {
      const status = await this.pollinationsProvider.getStatus();
      if (status.status === "AVAILABLE") return this.pollinationsProvider;
    }

    if (preferred === "gemini") {
      const geminiStatus = await this.geminiImageProvider.getStatus();
      if (geminiStatus.status === "AVAILABLE") return this.geminiImageProvider;
    }

    if (preferred === "fal") {
      const falStatus = await this.falProvider.getStatus();
      if (falStatus.status === "AVAILABLE") return this.falProvider;
    }

    if (preferred === "openai") {
      const status = await this.openaiProvider.getStatus();
      if (status.status === "AVAILABLE") return this.openaiProvider;
    }

    // Default Priority: Pollinations -> Gemini -> Fal.ai -> OpenAI
    const pollinationsStatus = await this.pollinationsProvider.getStatus();
    if (pollinationsStatus.status === "AVAILABLE") return this.pollinationsProvider;

    const geminiStatus = await this.geminiImageProvider.getStatus();
    if (geminiStatus.status === "AVAILABLE") return this.geminiImageProvider;

    const falStatus = await this.falProvider.getStatus();
    if (falStatus.status === "AVAILABLE") return this.falProvider;

    const openaiStatus = await this.openaiProvider.getStatus();
    if (openaiStatus.status === "AVAILABLE") return this.openaiProvider;

    if (preferred === "fal") return this.falProvider;
    if (preferred === "gemini") return this.geminiImageProvider;
    return this.pollinationsProvider;
  }

  async generateKeyframeForShot(
    req: KeyframeGenerationRequest,
  ): Promise<{ asset: MediaAsset; output: ImageGenerationOutput }> {
    const { workspaceId, projectId, shotId, shotPromptInput } = req;
    this.logger.log(`Initiating keyframe generation for project ${projectId}, shot ${shotId}`);

    // Emit realtime start event
    this.gateway.server.to(`project_${projectId}`).emit("image.generation.started", {
      projectId,
      shotId,
      timestamp: new Date().toISOString(),
    });

    // 1. Build deterministic prompt & options
    const promptOptions = this.promptBuilder.buildPrompt(shotPromptInput);

    // 2. Create PLANNED media asset in MediaService
    const plannedAsset = await this.mediaService.createPlannedAsset({
      workspaceId,
      projectId,
      shotId,
      assetType: AssetType.IMAGE,
      generationMetadata: {
        prompt: promptOptions.positivePrompt,
        negativePrompt: promptOptions.negativePrompt,
        aspectRatio: promptOptions.aspectRatio,
        characterIdentity: promptOptions.characterIdentity,
      },
    });

    // 3. Resolve active provider & generate image
    const provider = await this.getActiveProvider();
    const providerHealth = await provider.getStatus();

    if (providerHealth.status === "UNAVAILABLE") {
      await this.mediaService.markAssetFailed(
        plannedAsset.id,
        workspaceId,
        providerHealth.message || "Image provider UNAVAILABLE (Missing API key)",
      );
      this.gateway.server.to(`project_${projectId}`).emit("image.generation.failed", {
        projectId,
        shotId,
        reason: providerHealth.message,
      });
      throw new NotFoundException(
        `Image provider [${provider.name}] UNAVAILABLE: ${providerHealth.message}`,
      );
    }

    let output: ImageGenerationOutput;
    try {
      output = await provider.generateImage(promptOptions);
    } catch (err: any) {
      await this.mediaService.markAssetFailed(
        plannedAsset.id,
        workspaceId,
        err.message || "Provider generation request failed",
      );
      this.gateway.server.to(`project_${projectId}`).emit("image.generation.failed", {
        projectId,
        shotId,
        reason: err.message,
      });
      throw err;
    }

    // 4. Execute deterministic Image QC Validation
    const validation = this.qualityValidator.validateImage(
      output.buffer,
      output.mimeType,
      output.width,
      output.height,
    );

    // 5. Upload binary image buffer to Phase 3 storage provider
    const filename = `shot_${shotId}_keyframe_${Date.now()}.${validation.mimeType.split("/")[1] || "png"}`;
    const uploadedAsset = await this.mediaService.uploadAndSaveAsset(
      workspaceId,
      projectId,
      AssetType.IMAGE,
      filename,
      output.buffer,
      validation.mimeType,
      shotId,
    );

    // 6. Verify physical storage existence before marking AVAILABLE
    const finalAsset = await this.mediaService.markAssetAvailable(
      uploadedAsset.id,
      workspaceId,
      {
        size: validation.size,
        checksum: validation.checksum,
        width: validation.width,
        height: validation.height,
      },
    );

    // Update generation metadata
    finalAsset.generationMetadata = {
      ...finalAsset.generationMetadata,
      prompt: promptOptions.positivePrompt,
      negativePrompt: promptOptions.negativePrompt,
      provider: output.provider,
      model: output.model,
      latencyMs: output.latencyMs,
      requestId: output.requestId,
      estimatedCostUSD: output.estimatedCostUSD,
      seed: output.seed,
      consistencyMechanism: output.consistencyMechanism,
      validatedAt: new Date().toISOString(),
    };

    // 7. Emit realtime completed & available events
    this.gateway.server.to(`project_${projectId}`).emit("image.generation.completed", {
      projectId,
      shotId,
      assetId: finalAsset.id,
      storageKey: finalAsset.storageKey,
      latencyMs: output.latencyMs,
    });

    this.gateway.server.to(`project_${projectId}`).emit("asset.available", {
      projectId,
      shotId,
      assetId: finalAsset.id,
      assetType: AssetType.IMAGE,
      storageKey: finalAsset.storageKey,
    });

    return { asset: finalAsset, output };
  }
}
