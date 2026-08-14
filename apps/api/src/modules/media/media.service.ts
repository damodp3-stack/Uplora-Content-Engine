import { Injectable, Inject, Logger, NotFoundException, ForbiddenException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MediaAsset, AssetType, AssetStatus } from "./entities/media-asset.entity";
import { IMediaStorageProvider } from "./providers/storage-provider.interface";
import { MEDIA_STORAGE_PROVIDER } from "./providers/storage-provider.factory";

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(
    @InjectRepository(MediaAsset)
    private readonly assetRepo: Repository<MediaAsset>,
    @Inject(MEDIA_STORAGE_PROVIDER)
    private readonly storageProvider: IMediaStorageProvider,
  ) {}

  async createPlannedAsset(input: {
    workspaceId: string;
    projectId: string;
    shotId?: string;
    assetType: AssetType;
    provider?: string;
    storageKey?: string;
    generationMetadata?: Record<string, any>;
  }): Promise<MediaAsset> {
    const storageKey =
      input.storageKey ||
      `${input.workspaceId}/${input.projectId}/${input.assetType.toLowerCase()}_${Date.now()}`;

    const asset = this.assetRepo.create({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      shotId: input.shotId,
      assetType: input.assetType,
      status: AssetStatus.PLANNED,
      provider: input.provider || this.storageProvider.name,
      storageKey,
      size: 0,
      version: 1,
      generationMetadata: input.generationMetadata,
    });

    return await this.assetRepo.save(asset);
  }

  async uploadAndSaveAsset(
    workspaceId: string,
    projectId: string,
    assetType: AssetType,
    filename: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    shotId?: string,
  ): Promise<MediaAsset> {
    const storageKey = `${workspaceId}/${projectId}/${assetType.toLowerCase()}/${Date.now()}_${filename}`;
    
    // 1. Upload to physical storage
    const storageMeta = await this.storageProvider.upload(
      storageKey,
      data,
      mimeType,
    );

    // 2. Persist MediaAsset entity cleanly
    const asset = this.assetRepo.create({
      workspaceId,
      projectId,
      shotId,
      assetType,
      status: AssetStatus.AVAILABLE,
      provider: this.storageProvider.name,
      storageKey,
      mimeType,
      size: storageMeta.size,
      checksum: storageMeta.checksum,
      version: 1,
    });

    return await this.assetRepo.save(asset);
  }

  async getAssetById(id: string, workspaceId: string): Promise<MediaAsset> {
    const asset = await this.assetRepo.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Media asset ${id} not found.`);
    }
    if (asset.workspaceId !== workspaceId) {
      throw new ForbiddenException(`Workspace ${workspaceId} does not own asset ${id}.`);
    }
    return asset;
  }

  async getAssetsByProject(projectId: string, workspaceId: string): Promise<MediaAsset[]> {
    return await this.assetRepo.find({
      where: { projectId, workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  async getMediaLibrary(workspaceId: string): Promise<MediaAsset[]> {
    return await this.assetRepo.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
    });
  }

  async generateSignedUrl(
    id: string,
    workspaceId: string,
    expiresInSec: number = 3600,
  ): Promise<string> {
    const asset = await this.getAssetById(id, workspaceId);
    
    // Verify physical file exists in storage before generating signed URL
    const exists = await this.storageProvider.exists(asset.storageKey);
    if (!exists && asset.status === AssetStatus.AVAILABLE) {
      asset.status = AssetStatus.FAILED;
      await this.assetRepo.save(asset);
      throw new NotFoundException(
        `Physical asset file missing in storage for key: ${asset.storageKey}`,
      );
    }

    return await this.storageProvider.getSignedUrl(
      asset.storageKey,
      expiresInSec,
      "read",
    );
  }

  async markAssetAvailable(
    id: string,
    workspaceId: string,
    metadata?: { size?: number; checksum?: string; duration?: number; width?: number; height?: number },
  ): Promise<MediaAsset> {
    const asset = await this.getAssetById(id, workspaceId);

    // Verify physical existence
    const exists = await this.storageProvider.exists(asset.storageKey);
    if (!exists) {
      throw new NotFoundException(
        `Cannot mark asset AVAILABLE: file does not exist in storage key: ${asset.storageKey}`,
      );
    }

    asset.status = AssetStatus.AVAILABLE;
    if (metadata?.size) asset.size = metadata.size;
    if (metadata?.checksum) asset.checksum = metadata.checksum;
    if (metadata?.duration) asset.duration = metadata.duration;
    if (metadata?.width) asset.width = metadata.width;
    if (metadata?.height) asset.height = metadata.height;

    return await this.assetRepo.save(asset);
  }

  async markAssetFailed(id: string, workspaceId: string, reason: string): Promise<MediaAsset> {
    const asset = await this.getAssetById(id, workspaceId);
    asset.status = AssetStatus.FAILED;
    asset.generationMetadata = {
      ...asset.generationMetadata,
      failureReason: reason,
      failedAt: new Date().toISOString(),
    };
    return await this.assetRepo.save(asset);
  }

  async regenerateAsset(id: string, workspaceId: string): Promise<MediaAsset> {
    const oldAsset = await this.getAssetById(id, workspaceId);
    
    // Mark previous asset as SUPERSEDED
    oldAsset.status = AssetStatus.SUPERSEDED;
    await this.assetRepo.save(oldAsset);

    // Create new versioned asset
    const newStorageKey = `${workspaceId}/${oldAsset.projectId}/${oldAsset.assetType.toLowerCase()}/v${oldAsset.version + 1}_${Date.now()}`;
    const newAsset = this.assetRepo.create({
      workspaceId,
      projectId: oldAsset.projectId,
      shotId: oldAsset.shotId,
      assetType: oldAsset.assetType,
      status: AssetStatus.PLANNED,
      provider: oldAsset.provider,
      storageKey: newStorageKey,
      mimeType: oldAsset.mimeType,
      version: oldAsset.version + 1,
      parentAssetId: oldAsset.id,
      generationMetadata: oldAsset.generationMetadata,
    });

    return await this.assetRepo.save(newAsset);
  }

  async deleteAsset(id: string, workspaceId: string): Promise<void> {
    const asset = await this.getAssetById(id, workspaceId);
    
    // Delete from physical storage
    await this.storageProvider.delete(asset.storageKey);

    // Update status to DELETED
    asset.status = AssetStatus.DELETED;
    await this.assetRepo.save(asset);
  }
}
