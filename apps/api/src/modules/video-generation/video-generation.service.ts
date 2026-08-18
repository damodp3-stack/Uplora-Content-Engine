import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { FfmpegKeyframeMotionProvider } from './providers/ffmpeg-keyframe-motion.provider';
import { VideoQualityValidatorService } from './services/video-quality-validator.service';
import { MediaService } from '../media/media.service';
import { AssetType, MediaAsset } from '../media/entities/media-asset.entity';
import { CollaborationGateway } from '../realtime/collaboration.gateway';
import { MotionPreset } from './interfaces/keyframe-motion-provider.interface';

export interface GenerateVideoClipOptions {
  workspaceId: string;
  projectId: string;
  shotId: string;
  sourceKeyframeAssetId?: string;
  keyframeBuffer?: Buffer;
  durationSeconds?: number;
  width?: number;
  height?: number;
  motionPreset?: MotionPreset;
  fps?: number;
}

@Injectable()
export class VideoGenerationService {
  private readonly logger = new Logger(VideoGenerationService.name);

  constructor(
    private readonly motionProvider: FfmpegKeyframeMotionProvider,
    private readonly videoQC: VideoQualityValidatorService,
    private readonly mediaService: MediaService,
    private readonly gateway: CollaborationGateway,
  ) {}

  private emitEvent(roomId: string, event: string, payload: any) {
    try {
      if (this.gateway && this.gateway.server) {
        this.gateway.server.to(roomId).emit(event, payload);
      }
    } catch (_) {}
  }

  public async generateVideoClip(options: GenerateVideoClipOptions): Promise<MediaAsset> {
    const {
      workspaceId,
      projectId,
      shotId,
      sourceKeyframeAssetId,
      keyframeBuffer,
      durationSeconds = 3,
      width = 576,
      height = 1024,
      motionPreset = 'slow_zoom_in',
      fps = 30,
    } = options;

    const roomId = `project_${projectId}`;

    this.logger.log(
      `Initiating video clip synthesis for workspace ${workspaceId}, project ${projectId}, shot ${shotId} [motion=${motionPreset}]`,
    );

    // 1. Emit realtime event: video.generation.started
    this.emitEvent(roomId, 'video.generation.started', {
      workspaceId,
      projectId,
      shotId,
      motionPreset,
      status: 'GENERATING',
      timestamp: new Date().toISOString(),
    });

    let imageInputBuffer: Buffer;
    let sourceAsset: MediaAsset | null = null;

    // 2. Fetch keyframe source buffer
    if (keyframeBuffer && keyframeBuffer.length > 0) {
      imageInputBuffer = keyframeBuffer;
    } else if (sourceKeyframeAssetId) {
      sourceAsset = await this.mediaService.findOne(sourceKeyframeAssetId, workspaceId);
      if (!sourceAsset) {
        throw new NotFoundException(`Source keyframe MediaAsset ${sourceKeyframeAssetId} not found in workspace ${workspaceId}`);
      }
      imageInputBuffer = await this.mediaService.getAssetBuffer(sourceAsset.id, workspaceId);
    } else {
      // Find latest image keyframe asset for this shot
      const shotAssets = await this.mediaService.findByProjectAndShot(projectId, shotId, workspaceId);
      const latestImage = shotAssets.find(a => a.assetType === AssetType.IMAGE && a.status === 'AVAILABLE');
      if (!latestImage) {
        throw new NotFoundException(`No AVAILABLE image keyframe found for shot ${shotId} in project ${projectId}`);
      }
      sourceAsset = latestImage;
      imageInputBuffer = await this.mediaService.getAssetBuffer(latestImage.id, workspaceId);
    }

    // 3. Emit progress: RENDERING
    this.emitEvent(roomId, 'video.generation.progress', {
      workspaceId,
      projectId,
      shotId,
      progress: 30,
      status: 'RENDERING',
    });

    try {
      // 4. Synthesize video clip via local FFmpeg
      const motionOutput = await this.motionProvider.generateVideoClip({
        imageBuffer: imageInputBuffer,
        durationSeconds,
        width,
        height,
        motionPreset,
        fps,
        outputFormat: 'mp4',
      });

      // 5. Emit progress: UPLOADING
      this.emitEvent(roomId, 'video.generation.progress', {
        workspaceId,
        projectId,
        shotId,
        progress: 70,
        status: 'UPLOADING',
      });

      // 6. Quality Control Validation via ffprobe
      const qcResult = await this.videoQC.validateVideo(
        motionOutput.videoBuffer,
        durationSeconds,
        width,
        height,
      );

      if (!qcResult.isValid) {
        throw new InternalServerErrorException(
          `Video QC validation failed: ${qcResult.errors.join('; ')}`,
        );
      }

      // 7. Store video asset & handle versioning in MediaService
      const existingAssets = await this.mediaService.findByProjectAndShot(projectId, shotId, workspaceId);
      const previousVideoAsset = existingAssets.find(a => a.assetType === AssetType.VIDEO && a.status === 'AVAILABLE');

      const filename = `shot_${shotId}_clip_${Date.now()}.mp4`;
      const uploadedAsset = await this.mediaService.uploadAndSaveAsset(
        workspaceId,
        projectId,
        AssetType.VIDEO,
        filename,
        motionOutput.videoBuffer,
        'video/mp4',
        shotId,
      );

      const newMediaAsset = await this.mediaService.markAssetAvailable(
        uploadedAsset.id,
        workspaceId,
        {
          size: motionOutput.sizeBytes,
          checksum: motionOutput.sha256,
          width: motionOutput.width,
          height: motionOutput.height,
          duration: motionOutput.durationSeconds,
        },
      );

      newMediaAsset.generationMetadata = {
        ...newMediaAsset.generationMetadata,
        provider: 'keyframe-motion',
        motionPreset,
        fps: motionOutput.generationMetadata.fps,
        codec: motionOutput.codec,
        sourceKeyframeAssetId: sourceAsset ? sourceAsset.id : sourceKeyframeAssetId || null,
        frameCount: motionOutput.generationMetadata.frameCount,
        latencyMs: motionOutput.generationMetadata.latencyMs,
        ffmpegCommand: motionOutput.generationMetadata.ffmpegCommand,
      };

      // Supersede previous version if exists
      if (previousVideoAsset) {
        await this.mediaService.updateStatus(previousVideoAsset.id, workspaceId, 'SUPERSEDED' as any);
        this.logger.log(`Marked previous video asset ${previousVideoAsset.id} as SUPERSEDED for shot ${shotId}`);
      }

      // 8. Emit realtime completion & asset available events
      this.emitEvent(roomId, 'video.generation.completed', {
        workspaceId,
        projectId,
        shotId,
        mediaAssetId: newMediaAsset.id,
        durationSeconds: newMediaAsset.duration,
        sizeBytes: newMediaAsset.size,
        motionPreset,
        status: 'AVAILABLE',
      });

      this.emitEvent(roomId, 'asset.available', {
        workspaceId,
        projectId,
        shotId,
        assetId: newMediaAsset.id,
        assetType: AssetType.VIDEO,
        url: newMediaAsset.storageKey,
      });

      return newMediaAsset;
    } catch (err: any) {
      this.logger.error(`Video clip generation failed for shot ${shotId}: ${err.message}`);

      this.emitEvent(roomId, 'video.generation.failed', {
        workspaceId,
        projectId,
        shotId,
        error: err.message,
        status: 'FAILED',
      });

      throw new InternalServerErrorException(`Video clip generation failed: ${err.message}`);
    }
  }

  public async muxVideoWithAudio(options: {
    workspaceId: string;
    projectId: string;
    shotId: string;
    videoBuffer: Buffer;
    audioBuffer: Buffer;
    durationSeconds?: number;
    width?: number;
    height?: number;
  }): Promise<MediaAsset> {
    const { workspaceId, projectId, shotId, videoBuffer, audioBuffer, durationSeconds = 5, width = 768, height = 1344 } = options;
    const roomId = `project_${projectId}`;

    this.emitEvent(roomId, 'video.muxing.started', {
      workspaceId,
      projectId,
      shotId,
      status: 'MUXING',
      timestamp: new Date().toISOString(),
    });

    try {
      const muxResult = await this.motionProvider.muxAudioVideo({
        videoBuffer,
        audioBuffer,
        durationSeconds,
        width,
        height,
      });

      const filename = `shot_${shotId}_muxed_${Date.now()}.mp4`;
      const uploadedAsset = await this.mediaService.uploadAndSaveAsset(
        workspaceId,
        projectId,
        AssetType.VIDEO,
        filename,
        muxResult.videoBuffer,
        'video/mp4',
        shotId,
      );

      const availableAsset = await this.mediaService.markAssetAvailable(
        uploadedAsset.id,
        workspaceId,
        {
          size: muxResult.sizeBytes,
          checksum: muxResult.sha256,
          width: muxResult.width,
          height: muxResult.height,
          duration: muxResult.durationSeconds,
        },
      );

      this.emitEvent(roomId, 'video.muxing.completed', {
        workspaceId,
        projectId,
        shotId,
        mediaAssetId: availableAsset.id,
        status: 'AVAILABLE',
      });

      return availableAsset;
    } catch (err: any) {
      this.emitEvent(roomId, 'video.muxing.failed', {
        workspaceId,
        projectId,
        shotId,
        error: err.message,
      });
      throw new InternalServerErrorException(`Audio-Video Muxing failed: ${err.message}`);
    }
  }
}
