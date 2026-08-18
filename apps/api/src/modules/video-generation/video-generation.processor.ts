import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { VideoGenerationService, GenerateVideoClipOptions } from './video-generation.service';

@Processor('video-generation')
export class VideoGenerationProcessor {
  private readonly logger = new Logger(VideoGenerationProcessor.name);

  constructor(private readonly videoGenService: VideoGenerationService) {}

  @Process({ name: 'generate-video-clip', concurrency: 2 })
  public async handleGenerateVideoClip(job: { id?: string | number; data: GenerateVideoClipOptions }) {
    this.logger.log(
      `Processing queued video clip job #${job.id || 'async'} for shot ${job.data.shotId} (workspace: ${job.data.workspaceId})`,
    );

    try {
      const asset = await this.videoGenService.generateVideoClip(job.data);
      this.logger.log(`✅ Queue video clip job #${job.id || 'async'} completed successfully. MediaAsset ID: ${asset.id}`);
      return { status: 'SUCCESS', assetId: asset.id };
    } catch (err: any) {
      this.logger.error(`❌ Queue video clip job #${job.id || 'async'} failed: ${err.message}`);
      throw err;
    }
  }
}
