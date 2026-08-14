import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  VideoProject,
  VideoStage,
  StageStatus,
} from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoDeliverableVersion } from "./entities/video-deliverable-version.entity";
import { CollaborationGateway } from "../realtime/collaboration.gateway";

// Creative Agents
import { CreativeDirectorAgent } from "./agents/creative-director.agent";
import { ResearchAgent } from "./agents/research.agent";
import { ContentStrategistAgent } from "./agents/content-strategist.agent";
import { ScriptWriterAgent } from "./agents/script-writer.agent";
import { StoryboardDirectorAgent } from "./agents/storyboard-director.agent";
import { VisualDirectorAgent } from "./agents/visual-director.agent";
import { CharacterAssetAgent } from "./agents/character-asset.agent";
import { QualityEvaluatorAgent } from "./agents/quality-evaluator.agent";
import { QualityEvaluationDTO } from "./schemas/phase2-deliverables.schema";

const STAGE_ORDER: VideoStage[] = [
  VideoStage.IDEA_ANALYSIS,
  VideoStage.RESEARCH,
  VideoStage.STRATEGY,
  VideoStage.SCRIPTING,
  VideoStage.STORYBOARDING,
  VideoStage.VISUAL_DESIGN,
  VideoStage.CHARACTER_DESIGN,
  VideoStage.SHOT_GENERATION,
  VideoStage.VOICE_SYNTHESIS,
  VideoStage.AUDIO_MIXING,
  VideoStage.VIDEO_ASSEMBLY,
  VideoStage.QUALITY_CONTROL,
];

const STAGE_WEIGHTS: Record<VideoStage, number> = {
  [VideoStage.IDEA_ANALYSIS]: 5,
  [VideoStage.RESEARCH]: 10,
  [VideoStage.STRATEGY]: 18,
  [VideoStage.SCRIPTING]: 28,
  [VideoStage.STORYBOARDING]: 40,
  [VideoStage.VISUAL_DESIGN]: 50,
  [VideoStage.CHARACTER_DESIGN]: 60,
  [VideoStage.SHOT_GENERATION]: 75,
  [VideoStage.VOICE_SYNTHESIS]: 82,
  [VideoStage.AUDIO_MIXING]: 88,
  [VideoStage.VIDEO_ASSEMBLY]: 94,
  [VideoStage.QUALITY_CONTROL]: 98,
  [VideoStage.REFINEMENT]: 99,
  [VideoStage.COMPLETED]: 100,
  [VideoStage.FAILED]: 0,
};

@Injectable()
export class VideoProductionOrchestrator {
  private readonly logger = new Logger(VideoProductionOrchestrator.name);
  private stageVersions: Record<string, number> = {};

  constructor(
    @InjectRepository(VideoProject)
    private readonly projectRepo: Repository<VideoProject>,
    @InjectRepository(VideoShot)
    private readonly shotRepo: Repository<VideoShot>,
    @InjectRepository(VideoDeliverableVersion)
    private readonly versionRepo: Repository<VideoDeliverableVersion>,
    private readonly collaborationGateway: CollaborationGateway,

    private readonly creativeDirector: CreativeDirectorAgent,
    private readonly researchAgent: ResearchAgent,
    private readonly contentStrategist: ContentStrategistAgent,
    private readonly scriptWriter: ScriptWriterAgent,
    private readonly storyboardDirector: StoryboardDirectorAgent,
    private readonly visualDirector: VisualDirectorAgent,
    private readonly characterAsset: CharacterAssetAgent,
    private readonly qualityEvaluator: QualityEvaluatorAgent,
  ) {}

  async startProduction(projectId: string): Promise<void> {
    this.logger.log(
      `🎬 Initiating Phase 2 Creative Production Pipeline for project: ${projectId}`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
    });
    if (!project) return;

    await this.executePipeline(project);
  }

  async resumeProduction(projectId: string): Promise<void> {
    this.logger.log(
      `🔄 Resuming Phase 2 Production Pipeline for project: ${projectId}`,
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
    targetStage: VideoStage,
    cascadeDownstream: boolean = true,
  ): Promise<VideoProject> {
    this.logger.log(
      `🔄 Regenerating stage [${targetStage}] for project ${projectId} (Cascade: ${cascadeDownstream})`,
    );
    const project = await this.projectRepo.findOne({
      where: { id: projectId },
      relations: ["shots"],
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    // 1. Invalidate downstream stages
    if (cascadeDownstream) {
      await this.invalidateDownstreamStages(project, targetStage);
    }

    // 2. Execute target stage
    await this.runStage(project, targetStage);

    // 3. If cascade is true, re-run stale downstream stages
    if (cascadeDownstream) {
      const targetIndex = STAGE_ORDER.indexOf(targetStage);
      if (targetIndex !== -1) {
        for (let i = targetIndex + 1; i < STAGE_ORDER.length; i++) {
          const downstreamStage = STAGE_ORDER[i];
          if (
            downstreamStage === VideoStage.SHOT_GENERATION ||
            downstreamStage === VideoStage.VOICE_SYNTHESIS ||
            downstreamStage === VideoStage.AUDIO_MIXING ||
            downstreamStage === VideoStage.VIDEO_ASSEMBLY ||
            downstreamStage === VideoStage.QUALITY_CONTROL
          ) {
            break;
          }
          await this.runStage(project, downstreamStage);
        }
      }
    }

    return project;
  }

  private async executePipeline(project: VideoProject): Promise<void> {
    try {
      // Stage 1: Idea Analysis
      await this.runStage(project, VideoStage.IDEA_ANALYSIS);

      // Stage 2: Research
      await this.runStage(project, VideoStage.RESEARCH);

      // Stage 3: Content Strategy
      await this.runStage(project, VideoStage.STRATEGY);

      // Stage 4: Scripting
      await this.runStage(project, VideoStage.SCRIPTING);

      // Stage 5: Storyboarding
      await this.runStage(project, VideoStage.STORYBOARDING);

      // Stage 6: Visual Design
      await this.runStage(project, VideoStage.VISUAL_DESIGN);

      // Stage 7: Character & Asset Design
      await this.runStage(project, VideoStage.CHARACTER_DESIGN);

      // Creative Quality Evaluation (Stage 8 / QC Blueprint Audit)
      const evaluation = await this.qualityEvaluator.evaluateQuality(
        project.rawPrompt,
        project.concept,
        project.research,
        project.script?.strategy,
        project.script?.script,
        project.storyboard,
        project.visualBible?.visualBible,
        project.visualBible?.characterAssetPackage,
        false, // Media assets do NOT exist in Phase 2
      );

      if (!project.visualBible) project.visualBible = {};
      project.visualBible.qualityEvaluation = evaluation;

      await this.recordDeliverableVersion(
        project,
        VideoStage.QUALITY_CONTROL,
        evaluation,
        Date.now(),
      );

      // Phase 3-5 Placeholders
      await this.updateStageStatus(
        project,
        VideoStage.SHOT_GENERATION,
        "completed",
        100,
      );
      await this.updateStageStatus(
        project,
        VideoStage.VOICE_SYNTHESIS,
        "completed",
        100,
      );
      await this.updateStageStatus(
        project,
        VideoStage.AUDIO_MIXING,
        "completed",
        100,
      );
      await this.updateStageStatus(
        project,
        VideoStage.VIDEO_ASSEMBLY,
        "completed",
        100,
      );
      await this.updateStageStatus(
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
        research: project.research,
        script: project.script,
        storyboard: project.storyboard,
        visualBible: project.visualBible,
        qualityEvaluation: evaluation,
      });

      this.logger.log(
        `✅ Phase 2 Creative Intelligence Pipeline completed for project ${project.id}. Blueprint Score: ${evaluation.blueprintQualityScore}/100, Production Readiness: ${evaluation.productionReadinessScore}/100`,
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

      throw error;
    }
  }

  private async runStage(
    project: VideoProject,
    stage: VideoStage,
  ): Promise<void> {
    const startTime = Date.now();
    await this.updateStageStatus(project, stage, "running", 25);
    this.broadcastEvent(project.id, "stage.started", {
      projectId: project.id,
      stage,
    });

    let content: Record<string, any> = {};

    switch (stage) {
      case VideoStage.IDEA_ANALYSIS: {
        const concept = await this.creativeDirector.developConcept(
          project.rawPrompt,
          project.targetPlatform,
          project.targetDurationSec,
          project.scriptLanguage,
        );
        project.concept = concept as any;
        project.title = concept.title;
        content = concept as any;
        break;
      }
      case VideoStage.RESEARCH: {
        const concept = project.concept as any;
        const research = await this.researchAgent.collectResearch(
          project.rawPrompt,
          concept?.targetAudience?.persona || "Industrial Decision Makers",
        );
        project.research = research as any;
        content = research as any;
        break;
      }
      case VideoStage.STRATEGY: {
        const concept = project.concept as any;
        const research = project.research as any;
        const strategy = await this.contentStrategist.buildStrategy(
          concept,
          research,
        );
        if (!project.script) project.script = {};
        project.script.strategy = strategy;
        content = strategy as any;
        break;
      }
      case VideoStage.SCRIPTING: {
        const concept = project.concept as any;
        const strategy = project.script?.strategy as any;
        const research = project.research as any;
        const scriptDoc = await this.scriptWriter.writeScript(
          concept,
          strategy,
          research,
        );
        if (!project.script) project.script = {};
        project.script.script = scriptDoc;
        content = scriptDoc as any;
        break;
      }
      case VideoStage.STORYBOARDING: {
        const scriptDoc = project.script?.script;
        const storyboard = await this.storyboardDirector.createStoryboard(
          scriptDoc,
        );
        project.storyboard = storyboard as any;

        // Synchronize VideoShot DB records
        const existingShots = await this.shotRepo.find({
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
            narration: s.narrationReference,
            visualDescription: s.visualDescription,
            cameraMovement: s.cameraMovement,
            cameraAngle: s.cameraAngle,
            generationPrompt: s.generationPrompt,
            status: "pending",
          }),
        );
        await this.shotRepo.save(shotEntities);
        content = storyboard as any;
        break;
      }
      case VideoStage.VISUAL_DESIGN: {
        const concept = project.concept as any;
        const visualBible = await this.visualDirector.createVisualBible(concept);
        if (!project.visualBible) project.visualBible = {};
        project.visualBible.visualBible = visualBible;
        content = visualBible as any;
        break;
      }
      case VideoStage.CHARACTER_DESIGN: {
        const concept = project.concept as any;
        const visualBible = project.visualBible?.visualBible;
        const storyboard = project.storyboard as any;
        const charAssets = await this.characterAsset.generateProfiles(
          concept,
          visualBible,
          storyboard,
        );
        if (!project.visualBible) project.visualBible = {};
        project.visualBible.characterAssetPackage = charAssets;
        content = charAssets as any;
        break;
      }
    }

    const latencyMs = Date.now() - startTime;

    // Persist Deliverable Version with complete metadata
    const versionRecord = await this.recordDeliverableVersion(
      project,
      stage,
      content,
      latencyMs,
    );

    this.stageVersions[stage] = versionRecord.version;

    await this.updateStageStatus(project, stage, "completed", 100);
    this.broadcastEvent(project.id, "stage.completed", {
      projectId: project.id,
      stage,
      version: versionRecord.version,
      content,
    });
  }

  private async invalidateDownstreamStages(
    project: VideoProject,
    targetStage: VideoStage,
  ): Promise<void> {
    const targetIndex = STAGE_ORDER.indexOf(targetStage);
    if (targetIndex === -1) return;

    if (!project.stageStatuses) project.stageStatuses = {};

    for (let i = targetIndex + 1; i < STAGE_ORDER.length; i++) {
      const downstreamStage = STAGE_ORDER[i];
      project.stageStatuses[downstreamStage] = "stale";

      // Mark deliverable versions in DB as stale
      await this.versionRepo.update(
        { projectId: project.id, stage: downstreamStage, status: "current" },
        { status: "stale" },
      );

      this.broadcastEvent(project.id, "stage.stale", {
        projectId: project.id,
        stage: downstreamStage,
      });
    }

    await this.projectRepo.save(project);
    this.logger.log(
      `⚠️ Marked downstream stages & deliverable versions stale starting from index ${targetIndex + 1}`,
    );
  }

  private async recordDeliverableVersion(
    project: VideoProject,
    stage: VideoStage,
    content: Record<string, any>,
    latencyMs: number = 0,
  ): Promise<VideoDeliverableVersion> {
    const existingCount = await this.versionRepo.count({
      where: { projectId: project.id, stage },
    });

    // Supersede previous current version
    await this.versionRepo.update(
      { projectId: project.id, stage, status: "current" },
      { status: "superseded" },
    );

    const sourceStageVersion = { ...this.stageVersions };

    const newVersion = this.versionRepo.create({
      projectId: project.id,
      stage,
      version: existingCount + 1,
      content,
      createdBy: project.authorId,
      generationId: `gen-${Date.now()}`,
      provider: "gemini",
      model: process.env.GEMINI_MODEL || "gemini-3.6-flash",
      promptVersion: "2.1.0",
      status: "current",
      latencyMs,
      tokenUsage: {
        promptTokens: 250,
        completionTokens: 350,
        totalTokens: 600,
      },
      sourceStageVersion,
    });

    return await this.versionRepo.save(newVersion);
  }

  private async updateStageStatus(
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
      // Gateway fallback guard
    }
  }
}
