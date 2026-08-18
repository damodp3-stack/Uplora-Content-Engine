import { Test, TestingModule } from '@nestjs/testing';
import { VideoGenerationService } from './video-generation.service';
import { FfmpegKeyframeMotionProvider } from './providers/ffmpeg-keyframe-motion.provider';
import { VideoQualityValidatorService } from './services/video-quality-validator.service';
import { MediaService } from '../media/media.service';
import { CollaborationGateway } from '../realtime/collaboration.gateway';
import { AssetType, AssetStatus, MediaAsset } from '../media/entities/media-asset.entity';

describe('VideoGenerationService', () => {
  let service: VideoGenerationService;
  let motionProvider: FfmpegKeyframeMotionProvider;
  let videoQC: VideoQualityValidatorService;
  let mediaService: MediaService;
  let gateway: CollaborationGateway;

  const mockMotionProvider = {
    providerName: 'keyframe-motion',
    getStatus: jest.fn().mockResolvedValue('AVAILABLE'),
    generateVideoClip: jest.fn().mockResolvedValue({
      videoBuffer: Buffer.from('mock-mp4-data'),
      durationSeconds: 3,
      width: 576,
      height: 1024,
      mimeType: 'video/mp4',
      codec: 'h264',
      sha256: 'abc123sha',
      sizeBytes: 100,
      generationMetadata: {
        provider: 'keyframe-motion',
        motionPreset: 'slow_zoom_in',
        fps: 30,
        frameCount: 90,
        latencyMs: 500,
      },
    }),
  };

  const mockVideoQC = {
    validateVideo: jest.fn().mockResolvedValue({
      isValid: true,
      metadata: {
        durationSeconds: 3,
        width: 576,
        height: 1024,
        codec: 'h264',
        mimeType: 'video/mp4',
        sizeBytes: 100,
        fps: 30,
        container: 'mov,mp4,m4a,3gp,3g2,mj2',
      },
      errors: [],
    }),
  };

  const mockMediaService = {
    findOne: jest.fn().mockResolvedValue({
      id: 'asset-img-1',
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      shotId: 'shot-1',
      assetType: AssetType.IMAGE,
      status: AssetStatus.AVAILABLE,
    }),
    getAssetBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-jpeg-buffer')),
    findByProjectAndShot: jest.fn().mockResolvedValue([]),
    uploadAndSaveAsset: jest.fn().mockImplementation(async () => {
      const asset = new MediaAsset();
      asset.id = 'asset-video-1';
      asset.workspaceId = 'ws-1';
      asset.projectId = 'proj-1';
      asset.shotId = 'shot-1';
      asset.assetType = AssetType.VIDEO;
      asset.status = AssetStatus.PLANNED;
      asset.storageKey = 'ws-1/proj-1/video/test.mp4';
      return asset;
    }),
    markAssetAvailable: jest.fn().mockImplementation(async (id, wsId, meta) => {
      const asset = new MediaAsset();
      asset.id = id;
      asset.workspaceId = wsId;
      asset.assetType = AssetType.VIDEO;
      asset.status = AssetStatus.AVAILABLE;
      asset.size = meta.size;
      asset.checksum = meta.checksum;
      asset.width = meta.width;
      asset.height = meta.height;
      asset.duration = meta.duration;
      asset.storageKey = 'ws-1/proj-1/video/test.mp4';
      return asset;
    }),
    updateStatus: jest.fn().mockResolvedValue(true),
  };

  const mockGateway = {
    server: {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoGenerationService,
        { provide: FfmpegKeyframeMotionProvider, useValue: mockMotionProvider },
        { provide: VideoQualityValidatorService, useValue: mockVideoQC },
        { provide: MediaService, useValue: mockMediaService },
        { provide: CollaborationGateway, useValue: mockGateway },
      ],
    }).compile();

    service = module.get<VideoGenerationService>(VideoGenerationService);
    motionProvider = module.get<FfmpegKeyframeMotionProvider>(FfmpegKeyframeMotionProvider);
    videoQC = module.get<VideoQualityValidatorService>(VideoQualityValidatorService);
    mediaService = module.get<MediaService>(MediaService);
    gateway = module.get<CollaborationGateway>(CollaborationGateway);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a video clip and persist MediaAsset with status AVAILABLE', async () => {
    const result = await service.generateVideoClip({
      workspaceId: 'ws-1',
      projectId: 'proj-1',
      shotId: 'shot-1',
      keyframeBuffer: Buffer.from('sample-jpeg-payload'),
      durationSeconds: 3,
      width: 576,
      height: 1024,
      motionPreset: 'slow_zoom_in',
    });

    expect(result).toBeDefined();
    expect(result.assetType).toBe(AssetType.VIDEO);
    expect(result.status).toBe(AssetStatus.AVAILABLE);
    expect(mockMotionProvider.generateVideoClip).toHaveBeenCalled();
    expect(mockVideoQC.validateVideo).toHaveBeenCalled();
    expect(mockMediaService.uploadAndSaveAsset).toHaveBeenCalled();
    expect(mockMediaService.markAssetAvailable).toHaveBeenCalled();
  });
});
