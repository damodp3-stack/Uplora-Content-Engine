import { Process, Processor } from "@nestjs/bull";
import { Logger } from "@nestjs/common";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";

@Processor("video-production")
export class VideoProductionProcessor {
  private readonly logger = new Logger(VideoProductionProcessor.name);

  constructor(private readonly orchestrator: VideoProductionOrchestrator) {}

  @Process("start")
  async handleStartProduction(job: { data: { projectId: string } }) {
    this.logger.log(
      `Processing start production job for project ${job.data.projectId}`,
    );
    await this.orchestrator.startProduction(job.data.projectId);
  }

  @Process("resume")
  async handleResumeProduction(job: { data: { projectId: string } }) {
    this.logger.log(
      `Processing resume production job for project ${job.data.projectId}`,
    );
    await this.orchestrator.resumeProduction(job.data.projectId);
  }
}
