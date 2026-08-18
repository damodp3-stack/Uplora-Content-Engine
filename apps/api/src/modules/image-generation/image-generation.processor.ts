import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { ImageGenerationService, KeyframeGenerationRequest } from "./image-generation.service";

@Processor("image-generation")
export class ImageGenerationProcessor {
  private readonly logger = new Logger(ImageGenerationProcessor.name);

  constructor(private readonly imageService: ImageGenerationService) {}

  @Process({ name: "generate-keyframe", concurrency: 1 })
  async handleGenerateKeyframe(job: { data: KeyframeGenerationRequest }) {
    const { projectId, shotId } = job.data;
    this.logger.log(`Processing async image-generation job for project ${projectId}, shot ${shotId}`);

    try {
      const result = await this.imageService.generateKeyframeForShot(job.data);
      this.logger.log(
        `✅ Async image-generation job completed for shot ${shotId}. Asset ID: ${result.asset.id}`,
      );
      return result.asset;
    } catch (err: any) {
      this.logger.error(
        `❌ Async image-generation job failed for shot ${shotId}: ${err.message}`,
      );
      throw err;
    }
  }
}
