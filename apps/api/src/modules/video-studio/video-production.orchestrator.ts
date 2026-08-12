import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  VideoProject,
  VideoStage,
  StageStatus,
} from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { CollaborationGateway } from "../realtime/collaboration.gateway";

const STAGE_WEIGHTS: Record<VideoStage, number> = {
  [VideoStage.IDEA_ANALYSIS]: 5,
  [VideoStage.SCRIPTING]: 15,
  [VideoStage.STORYBOARDING]: 25,
  [VideoStage.VISUAL_DESIGN]: 35,
  [VideoStage.SHOT_GENERATION]: 60,
  [VideoStage.VOICE_SYNTHESIS]: 75,
  [VideoStage.AUDIO_MIXING]: 85,
  [VideoStage.VIDEO_ASSEMBLY]: 92,
  [VideoStage.QUALITY_CONTROL]: 97,
  [VideoStage.REFINEMENT]: 99,
  [VideoStage.COMPLETED]: 100,
  [VideoStage.FAILED]: 0,
};

@Injectable()
export class VideoProductionOrchestrator {
  private readonly logger = new Logger(VideoProductionOrchestrator.name);

  constructor(
    @InjectRepository(VideoProject)
    private readonly projectRepo: Repository<VideoProject>,
    @InjectRepository(VideoShot)
    private readonly shotRepo: Repository<VideoShot>,
    private readonly collaborationGateway: CollaborationGateway,
  ) {}

  async startProduction(projectId: string): Promise<void> {
    this.logger.log(
      `🎬 Initiating production pipeline for project: ${projectId}`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;

    await this.executePipeline(project);
  }

  async resumeProduction(projectId: string): Promise<void> {
    this.logger.log(
      `🔄 Resuming production pipeline for project: ${projectId}`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ["shots"],
    });
    if (!project) return;

    await this.executePipeline(project);
  }

  private async executePipeline(project: VideoProject): Promise<void> {
    try {
      // Stage 1: Idea Analysis
      await this.updateStage(project, VideoStage.IDEA_ANALYSIS, "running", 20);
      project.concept = {
        objective:
          "Explain importance of professional websites for industrial firms",
        targetAudience: "B2B Business Owners & Factory Directors",
        format: "Instagram Reel (9:16)",
        hookType: "Surprising Stat Hook",
      };
      await this.updateStage(
        project,
        VideoStage.IDEA_ANALYSIS,
        "completed",
        100,
      );

      // Stage 2: Scripting
      await this.updateStage(project, VideoStage.SCRIPTING, "running", 30);
      project.script = {
        title: "Why Industrial Companies Need a Website in 2026",
        narrationText:
          "92% of industrial buyers research online before making a $100k vendor deal. If your company doesn't have a professional website, you're losing deals to competitors every single day. Uplora builds high-converting industrial websites built for growth.",
        durationSec: project.targetDurationSec || 30,
      };
      await this.updateStage(project, VideoStage.SCRIPTING, "completed", 100);

      // Stage 3: Storyboarding
      await this.updateStage(project, VideoStage.STORYBOARDING, "running", 40);
      const shotsCount = Math.ceil((project.targetDurationSec || 30) / 4);
      let existingShots = await this.shotRepo.find({
        where: { projectId: project.id },
      });

      if (existingShots.length === 0) {
        const newShots: Partial<VideoShot>[] = [];
        for (let i = 1; i <= shotsCount; i++) {
          newShots.push({
            projectId: project.id,
            shotNumber: i,
            durationSec: 4.0,
            narration: `Scene ${i} narration text segment`,
            visualDescription: `Industrial plant shot ${i} with modern lighting`,
            cameraMovement: "Slow push in",
            cameraAngle: "Eye level",
            status: "pending",
          });
        }
        await this.shotRepo.save(newShots);
        existingShots = await this.shotRepo.find({
          where: { projectId: project.id },
        });
      }
      await this.updateStage(
        project,
        VideoStage.STORYBOARDING,
        "completed",
        100,
      );

      // Stage 4: Visual Design
      await this.updateStage(project, VideoStage.VISUAL_DESIGN, "running", 50);
      project.visualBible = {
        colorPalette: ["#0F172A", "#3B82F6", "#10B981"],
        lightingStyle: "Cinematic Industrial Minimal",
        characterSeed: 104258,
      };
      await this.updateStage(
        project,
        VideoStage.VISUAL_DESIGN,
        "completed",
        100,
      );

      // Stage 5: Shot Generation
      await this.updateStage(
        project,
        VideoStage.SHOT_GENERATION,
        "running",
        10,
      );
      for (let i = 0; i < existingShots.length; i++) {
        const shot = existingShots[i];
        if (shot.status !== "completed") {
          shot.status = "generating";
          await this.shotRepo.save(shot);

          // Simulate shot generation
          shot.videoUrl = `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`;
          shot.status = "completed";
          await this.shotRepo.save(shot);
        }
        const shotProgress = Math.round(((i + 1) / existingShots.length) * 100);
        await this.updateStage(
          project,
          VideoStage.SHOT_GENERATION,
          "running",
          shotProgress,
        );
      }
      await this.updateStage(
        project,
        VideoStage.SHOT_GENERATION,
        "completed",
        100,
      );

      // Stage 6: Voice Synthesis
      await this.updateStage(
        project,
        VideoStage.VOICE_SYNTHESIS,
        "running",
        60,
      );
      await this.updateStage(
        project,
        VideoStage.VOICE_SYNTHESIS,
        "completed",
        100,
      );

      // Stage 7: Audio Mixing
      await this.updateStage(project, VideoStage.AUDIO_MIXING, "running", 70);
      await this.updateStage(
        project,
        VideoStage.AUDIO_MIXING,
        "completed",
        100,
      );

      // Stage 8: Video Assembly
      await this.updateStage(project, VideoStage.VIDEO_ASSEMBLY, "running", 80);
      project.finalVideoUrl = `https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4`;
      project.thumbnailUrl = `https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=1080&q=80`;
      await this.updateStage(
        project,
        VideoStage.VIDEO_ASSEMBLY,
        "completed",
        100,
      );

      // Stage 9: Quality Control
      await this.updateStage(
        project,
        VideoStage.QUALITY_CONTROL,
        "running",
        90,
      );
      project.qcResult = {
        overallScore: 92,
        hookScore: 94,
        pacingScore: 90,
        continuityScore: 91,
        approved: true,
      };
      await this.updateStage(
        project,
        VideoStage.QUALITY_CONTROL,
        "completed",
        100,
      );

      // Stage 10: Completion
      project.currentStage = VideoStage.COMPLETED;
      project.overallProgressPercent = 100;
      project.stageProgressPercent = 100;
      await this.projectRepo.save(project);

      this.broadcastEvent(project.id, "production.completed", {
        projectId: project.id,
        finalVideoUrl: project.finalVideoUrl,
        qcResult: project.qcResult,
      });

      this.logger.log(`✅ Production completed for project ${project.id}`);
    } catch (error) {
      this.logger.error(
        `❌ Production failed for project ${project.id}: ${(error as Error).message}`,
      );
      project.currentStage = VideoStage.FAILED;
      project.errorMessage = (error as Error).message;
      await this.projectRepo.save(project);

      this.broadcastEvent(project.id, "production.failed", {
        projectId: project.id,
        error: (error as Error).message,
      });
    }
  }

  private async updateStage(
    project: VideoProject,
    stage: VideoStage,
    status: StageStatus,
    progress: number,
  ): Promise<void> {
    project.currentStage = stage;
    project.stageProgressPercent = progress;
    if (!project.stageStatuses) project.stageStatuses = {};
    project.stageStatuses[stage] = status;
    project.overallProgressPercent = STAGE_WEIGHTS[stage] || 0;

    await this.projectRepo.save(project);

    this.broadcastEvent(project.id, "stage.progress", {
      projectId: project.id,
      stage,
      status,
      stageProgress: progress,
      overallProgress: project.overallProgressPercent,
    });
  }

  private broadcastEvent(
    projectId: string,
    event: string,
    payload: unknown,
  ): void {
    try {
      this.collaborationGateway.server
        ?.to(`project:${projectId}`)
        .emit(event, payload);
    } catch (err) {
      // Gateway may not be attached in unit test context
    }
  }
}
