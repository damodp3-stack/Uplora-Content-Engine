import { MediaService } from "./media.service";
import { MediaAsset, AssetType, AssetStatus } from "./entities/media-asset.entity";
import { IMediaStorageProvider } from "./providers/storage-provider.interface";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

describe("MediaService", () => {
  let service: MediaService;
  let mockAssetRepo: any;
  let mockStorageProvider: jest.Mocked<IMediaStorageProvider>;
  let savedAssets: MediaAsset[] = [];

  beforeEach(() => {
    savedAssets = [];

    mockAssetRepo = {
      create: jest.fn().mockImplementation((dto) => ({
        id: `asset-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...dto,
      })),
      save: jest.fn().mockImplementation(async (asset) => {
        const index = savedAssets.findIndex((a) => a.id === asset.id);
        if (index >= 0) {
          savedAssets[index] = { ...savedAssets[index], ...asset };
          return savedAssets[index];
        }
        savedAssets.push(asset);
        return asset;
      }),
      findOne: jest.fn().mockImplementation(async ({ where }) => {
        return savedAssets.find((a) => a.id === where.id) || null;
      }),
      find: jest.fn().mockImplementation(async ({ where }) => {
        return savedAssets.filter(
          (a) =>
            (!where.workspaceId || a.workspaceId === where.workspaceId) &&
            (!where.projectId || a.projectId === where.projectId),
        );
      }),
    };

    mockStorageProvider = {
      name: "local",
      upload: jest.fn().mockResolvedValue({
        key: "ws-1/proj-1/image.png",
        size: 1024,
        mimeType: "image/png",
        checksum: "sha256-checksum",
        url: "http://localhost/ws-1/proj-1/image.png",
      }),
      download: jest.fn().mockResolvedValue(Buffer.from("data")),
      delete: jest.fn().mockResolvedValue(undefined),
      exists: jest.fn().mockResolvedValue(true),
      getSignedUrl: jest.fn().mockResolvedValue("http://localhost/signed-url"),
      getMetadata: jest.fn().mockResolvedValue({
        key: "ws-1/proj-1/image.png",
        size: 1024,
        mimeType: "image/png",
      }),
    };

    service = new MediaService(mockAssetRepo, mockStorageProvider);
  });

  it("should create planned media asset in PLANNED state", async () => {
    const planned = await service.createPlannedAsset({
      workspaceId: "ws-100",
      projectId: "proj-200",
      assetType: AssetType.IMAGE,
    });

    expect(planned.status).toBe(AssetStatus.PLANNED);
    expect(planned.version).toBe(1);
    expect(planned.workspaceId).toBe("ws-100");
  });

  it("should upload and save asset with physical storage metadata", async () => {
    const asset = await service.uploadAndSaveAsset(
      "ws-100",
      "proj-200",
      AssetType.IMAGE,
      "banner.png",
      Buffer.from("banner-bytes"),
      "image/png",
    );

    expect(asset.status).toBe(AssetStatus.AVAILABLE);
    expect(asset.checksum).toBe("sha256-checksum");
    expect(mockStorageProvider.upload).toHaveBeenCalledTimes(1);
  });

  it("should enforce workspace isolation when fetching asset by ID", async () => {
    const asset = await service.createPlannedAsset({
      workspaceId: "ws-owner",
      projectId: "proj-1",
      assetType: AssetType.VIDEO,
    });

    await expect(service.getAssetById(asset.id, "ws-intruder")).rejects.toThrow(
      ForbiddenException,
    );
  });

  it("should generate signed URL only when file exists in physical storage", async () => {
    const asset = await service.uploadAndSaveAsset(
      "ws-100",
      "proj-200",
      AssetType.IMAGE,
      "test.png",
      Buffer.from("bytes"),
      "image/png",
    );

    const signedUrl = await service.generateSignedUrl(asset.id, "ws-100", 1800);
    expect(signedUrl).toBe("http://localhost/signed-url");

    // Test physical file missing error
    mockStorageProvider.exists.mockResolvedValueOnce(false);
    await expect(service.generateSignedUrl(asset.id, "ws-100")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should mark asset AVAILABLE only when file physically exists in storage", async () => {
    const asset = await service.createPlannedAsset({
      workspaceId: "ws-100",
      projectId: "proj-200",
      assetType: AssetType.AUDIO,
    });

    mockStorageProvider.exists.mockResolvedValueOnce(false);
    await expect(service.markAssetAvailable(asset.id, "ws-100")).rejects.toThrow(
      NotFoundException,
    );

    mockStorageProvider.exists.mockResolvedValueOnce(true);
    const updated = await service.markAssetAvailable(asset.id, "ws-100", { size: 2048 });
    expect(updated.status).toBe(AssetStatus.AVAILABLE);
  });

  it("should handle asset regeneration and mark previous version as SUPERSEDED", async () => {
    const v1Asset = await service.uploadAndSaveAsset(
      "ws-100",
      "proj-200",
      AssetType.IMAGE,
      "hero.png",
      Buffer.from("v1-bytes"),
      "image/png",
    );

    const v2Asset = await service.regenerateAsset(v1Asset.id, "ws-100");

    expect(v1Asset.status).toBe(AssetStatus.SUPERSEDED);
    expect(v2Asset.version).toBe(2);
    expect(v2Asset.parentAssetId).toBe(v1Asset.id);
  });
});
