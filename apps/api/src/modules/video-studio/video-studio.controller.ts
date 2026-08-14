import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { InjectQueue } from "@nestjs/bull";
import { VideoProject, VideoStage } from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoDeliverableVersion } from "./entities/video-deliverable-version.entity";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";

export interface CreateVideoProjectDto {
  title: string;
  rawPrompt: string;
  targetPlatform?: string;
  targetDurationSec?: number;
  scriptLanguage?: string;
  voiceLanguage?: string;
  subtitleLanguage?: string;
}

@ApiTags("Video Studio")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("video-studio")
export class VideoStudioController {
  constructor(
    @InjectRepository(VideoProject)
    private readonly projectRepo: Repository<VideoProject>,
    @InjectRepository(VideoShot)
    private readonly shotRepo: Repository<VideoShot>,
    @InjectRepository(VideoDeliverableVersion)
    private readonly versionRepo: Repository<VideoDeliverableVersion>,
    @InjectQueue("video-production")
    private readonly productionQueue: any,
    private readonly orchestrator: VideoProductionOrchestrator,
  ) {}

  @Post("create")
  @ApiOperation({ summary: "Initiate autonomous AI video production job" })
  async createProject(@Req() req: any, @Body() dto: CreateVideoProjectDto) {
    const user = req.user || {};
    const workspaceId = user.activeWorkspaceId || user.workspaceId || "default-workspace";
    const authorId = user.id || "anonymous-user";

    const project = this.projectRepo.create({
      workspaceId,
      authorId,
      title: dto.title || "Untitled AI Reel",
      rawPrompt: dto.rawPrompt,
      targetPlatform: dto.targetPlatform || "instagram_reels",
      targetDurationSec: dto.targetDurationSec || 30,
      scriptLanguage: dto.scriptLanguage || "english",
      voiceLanguage: dto.voiceLanguage || "english",
      subtitleLanguage: dto.subtitleLanguage || "english",
      currentStage: VideoStage.IDEA_ANALYSIS,
      stageProgressPercent: 0,
      overallProgressPercent: 0,
    });

    const saved = await this.projectRepo.save(project);
    await this.productionQueue.add("start", { projectId: saved.id });

    return {
      success: true,
      message: "Video production job queued successfully",
      data: saved,
    };
  }

  @Get("projects/:id")
  @ApiOperation({
    summary: "Get video project state and real-time stage progress",
  })
  async getProject(@Req() req: any, @Param("id") id: string) {
    const user = req.user || {};
    const workspaceId = user.activeWorkspaceId || user.workspaceId;

    const query: any = { id };
    if (workspaceId) query.workspaceId = workspaceId;

    const project = await this.projectRepo.findOne({
      where: query,
      relations: ["shots", "deliverableVersions"],
    });

    if (!project) {
      throw new NotFoundException(`Video project ${id} not found`);
    }

    return {
      success: true,
      data: project,
    };
  }

  @Post("projects/:id/resume")
  @ApiOperation({
    summary: "Resume interrupted or failed video project pipeline",
  })
  async resumeProject(@Param("id") id: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Video project ${id} not found`);
    }

    await this.productionQueue.add("resume", { projectId: id });

    return {
      success: true,
      message: "Video production resume job queued",
    };
  }

  @Post("projects/:id/regenerate-stage")
  @ApiOperation({ summary: "Regenerate specific production stage" })
  async regenerateStage(
    @Param("id") id: string,
    @Body("stage") stage: VideoStage,
    @Body("cascadeDownstream") cascadeDownstream: boolean = true,
  ) {
    const updated = await this.orchestrator.regenerateStage(
      id,
      stage,
      cascadeDownstream,
    );
    return {
      success: true,
      message: `Stage ${stage} regenerated successfully`,
      data: updated,
    };
  }

  @Get("projects/:id/versions")
  @ApiOperation({ summary: "Get deliverable version history" })
  async getDeliverableVersions(@Param("id") id: string) {
    const versions = await this.versionRepo.find({
      where: { projectId: id },
      order: { createdAt: "DESC" },
    });

    return {
      success: true,
      data: versions,
    };
  }

  @Post("projects/:id/restore-version")
  @ApiOperation({ summary: "Restore specific deliverable version" })
  async restoreVersion(
    @Param("id") id: string,
    @Body("versionId") versionId: string,
  ) {
    const version = await this.versionRepo.findOne({
      where: { id: versionId, projectId: id },
    });

    if (!version) {
      throw new NotFoundException(`Version ${versionId} not found`);
    }

    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    if (version.stage === VideoStage.IDEA_ANALYSIS) project.concept = version.content;
    else if (version.stage === VideoStage.RESEARCH) project.research = version.content;
    else if (version.stage === VideoStage.SCRIPTING) {
      if (!project.script) project.script = {};
      project.script.script = version.content;
    } else if (version.stage === VideoStage.STRATEGY) {
      if (!project.script) project.script = {};
      project.script.strategy = version.content;
    } else if (version.stage === VideoStage.STORYBOARDING) project.storyboard = version.content;
    else if (version.stage === VideoStage.VISUAL_DESIGN) {
      if (!project.visualBible) project.visualBible = {};
      project.visualBible.visualBible = version.content;
    } else if (version.stage === VideoStage.CHARACTER_DESIGN) {
      if (!project.visualBible) project.visualBible = {};
      project.visualBible.characterAssetPackage = version.content;
    }

    await this.projectRepo.save(project);

    return {
      success: true,
      message: `Restored version ${version.version} for stage ${version.stage}`,
      data: project,
    };
  }

  @Get("projects")
  @ApiOperation({ summary: "List workspace video projects" })
  async listProjects(@Req() req: any) {
    const user = req.user || {};
    const workspaceId = user.activeWorkspaceId || user.workspaceId || "default-workspace";

    const projects = await this.projectRepo.find({
      where: { workspaceId },
      order: { createdAt: "DESC" },
      take: 20,
    });

    return {
      success: true,
      data: projects,
    };
  }
}
