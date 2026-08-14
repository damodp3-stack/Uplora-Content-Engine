import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { MediaService } from "./media.service";
import { AssetType } from "./entities/media-asset.entity";

@Processor("media-processing")
export class MediaProcessingProcessor {
  private readonly logger = new Logger(MediaProcessingProcessor.name);

  constructor(private readonly mediaService: MediaService) {}

  @Process("upload-asset")
  async handleUploadAsset(job: {
    data: {
      workspaceId: string;
      projectId: string;
      assetType: AssetType;
      filename: string;
      dataBase64: string;
      mimeType: string;
      shotId?: string;
    };
  }) {
    const { workspaceId, projectId, assetType, filename, dataBase64, mimeType, shotId } = job.data;
    this.logger.log(
      `Processing async storage upload job for project ${projectId}, asset: ${filename}`,
    );

    const buffer = Buffer.from(dataBase64, "base64");
    const asset = await this.mediaService.uploadAndSaveAsset(
      workspaceId,
      projectId,
      assetType,
      filename,
      buffer,
      mimeType,
      shotId,
    );

    this.logger.log(`✅ Async storage upload completed for asset ID: ${asset.id}`);
    return asset;
  }

  @Process("regenerate-asset")
  async handleRegenerateAsset(job: {
    data: { assetId: string; workspaceId: string };
  }) {
    const { assetId, workspaceId } = job.data;
    this.logger.log(`Processing async asset regeneration job for asset ID ${assetId}`);

    const newAsset = await this.mediaService.regenerateAsset(assetId, workspaceId);
    this.logger.log(`✅ Async asset regeneration completed, new version ID: ${newAsset.id}`);
    return newAsset;
  }
}
