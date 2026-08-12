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

// Creative Agents
import { CreativeDirectorAgent } from "./agents/creative-director.agent";
import { ContentStrategistAgent } from "./agents/content-strategist.agent";
import { ScriptWriterAgent } from "./agents/script-writer.agent";
import { StoryboardDirectorAgent } from "./agents/storyboard-director.agent";
import { VisualDirectorAgent } from "./agents/visual-director.agent";
import { CharacterAssetAgent } from "./agents/character-asset.agent";

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

    private readonly creativeDirector: CreativeDirectorAgent,
    private readonly contentStrategist: ContentStrategistAgent,
    private readonly scriptWriter: ScriptWriterAgent,
    private readonly storyboardDirector: StoryboardDirectorAgent,
    private readonly visualDirector: VisualDirectorAgent,
    private readonly characterAsset: CharacterAssetAgent,
  ) {}

  async startProduction(projectId: string): Promise<void> {
    this.logger.log(
      `🎬 Initiating Phase 2 Creative Production for project: ${projectId}`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;

    await this.executePipeline(project);
  }

  async resumeProduction(projectId: string): Promise<void> {
    this.logger.log(
      `🔄 Resuming Phase 2 Creative Production for project: ${projectId}`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ["shots"],
    });
    if (!project) return;

    await this.executePipeline(project);
  }

  async regenerateStage(
    projectId: string,
    stage: VideoStage,
  ): Promise<VideoProject> {
    this.logger.log(
      `🔄 Regenerating stage [${stage}] for project: ${projectId}`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ["shots"],
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    if (stage === VideoStage.IDEA_ANALYSIS) {
      await this.runIdeaAnalysis(project);
    } else if (stage === VideoStage.SCRIPTING) {
      await this.runScripting(project);
    } else if (stage === VideoStage.STORYBOARDING) {
      await this.runStoryboarding(project);
    } else if (stage === VideoStage.VISUAL_DESIGN) {
      await this.runVisualDesign(project);
    }

    return project;
  }

  private async executePipeline(project: VideoProject): Promise<void> {
    try {
      // Stage 1: Idea Analysis -> CreativeConceptDTO
      await this.runIdeaAnalysis(project);

      // Stage 2: Scripting -> StrategyBlueprintDTO & ScriptDocumentDTO
      await this.runScripting(project);

      // Stage 3: Storyboarding -> StoryboardDTO & VideoShot Entities
      await this.runStoryboarding(project);

      // Stage 4: Visual Design -> VisualBibleDTO & CharacterProfileDTO[]
      await this.runVisualDesign(project);

      // Stage 5 to 10: Placeholder handlers for downstream Phase 3-5 execution
      await this.updateStage(
        project,
        VideoStage.SHOT_GENERATION,
        "completed",
        100,
      );
      await this.updateStage(
        project,
        VideoStage.VOICE_SYNTHESIS,
        "completed",
        100,
      );
      await this.updateStage(
        project,
        VideoStage.AUDIO_MIXING,
        "completed",
        100,
      );
      await this.updateStage(
        project,
        VideoStage.VIDEO_ASSEMBLY,
        "completed",
        100,
      );
      await this.updateStage(
        project,
        VideoStage.QUALITY_CONTROL,
        "completed",
        100,
      );

      project.currentStage = VideoStage.COMPLETED;
      project.overallProgressPercent = 100;
      project.stageProgressPercent = 100;
      await this.projectRepo.save(project);

      this.broadcastEvent(project.id, "production.completed", {
        projectId: project.id,
        concept: project.concept,
        script: project.script,
        storyboard: project.storyboard,
        visualBible: project.visualBible,
      });

      this.logger.log(
        `✅ Phase 2 Creative Intelligence completed for project ${project.id}`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Creative pipeline failed for project ${project.id}: ${(error as Error).message}`,
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

  private async runIdeaAnalysis(project: VideoProject): Promise<void> {
    await this.updateStage(project, VideoStage.IDEA_ANALYSIS, "running", 20);
    const concept = await this.creativeDirector.developConcept(
      project.rawPrompt,
      project.targetPlatform,
    );
    project.concept = concept as any;
    project.title = concept.title;
    await this.updateStage(project, VideoStage.IDEA_ANALYSIS, "completed", 100);
  }

  private async runScripting(project: VideoProject): Promise<void> {
    await this.updateStage(project, VideoStage.SCRIPTING, "running", 30);
    const concept = project.concept as any;
    const strategy = await this.contentStrategist.buildStrategy(
      concept,
      project.targetDurationSec,
    );
    const script = await this.scriptWriter.writeScript(concept, strategy, {
      script: project.scriptLanguage || "english",
      voice: project.voiceLanguage || "english",
      subtitles: project.subtitleLanguage || "english",
    });
    project.script = { strategy, script } as any;
    await this.updateStage(project, VideoStage.SCRIPTING, "completed", 100);
  }

  private async runStoryboarding(project: VideoProject): Promise<void> {
    await this.updateStage(project, VideoStage.STORYBOARDING, "running", 40);
    const script = project.script?.script;
    const storyboard = await this.storyboardDirector.createStoryboard(script);
    project.storyboard = storyboard as any;

    // Synchronize DB VideoShot entities
    let existingShots = await this.shotRepo.find({
      where: { projectId: project.id },
    });
    if (existingShots.length > 0) {
      await this.shotRepo.remove(existingShots);
    }

    const shotEntities = storyboard.shots.map((s) =>
      this.shotRepo.create({
        projectId: project.id,
        shotNumber: s.shotNumber,
        durationSec: s.durationSec,
        narration: s.narrationText,
        visualDescription: s.visualDescription,
        cameraMovement: s.cameraMovement,
        cameraAngle: s.cameraAngle,
        generationPrompt: s.generationPrompt,
        status: "pending",
      }),
    );
    await this.shotRepo.save(shotEntities);

    await this.updateStage(project, VideoStage.STORYBOARDING, "completed", 100);
  }

  private async runVisualDesign(project: VideoProject): Promise<void> {
    await this.updateStage(project, VideoStage.VISUAL_DESIGN, "running", 50);
    const concept = project.concept as any;
    const visualBible = await this.visualDirector.createVisualBible(concept);
    const characterProfiles = await this.characterAsset.generateProfiles(
      concept,
      visualBible,
    );
    project.visualBible = { visualBible, characterProfiles } as any;
    await this.updateStage(project, VideoStage.VISUAL_DESIGN, "completed", 100);
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
      // Gateway context guard
    }
  }
}
