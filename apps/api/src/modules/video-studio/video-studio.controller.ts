import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bull';
import { VideoProject, VideoStage } from './entities/video-project.entity';
import { VideoShot } from './entities/video-shot.entity';

export interface CreateVideoProjectDto {
  title: string;
  rawPrompt: string;
  targetPlatform?: string;
  targetDurationSec?: number;
  scriptLanguage?: string;
  voiceLanguage?: string;
  subtitleLanguage?: string;
}

@ApiTags('Video Studio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('video-studio')
export class VideoStudioController {
  constructor(
    @InjectRepository(VideoProject)
    private readonly projectRepo: Repository<VideoProject>,
    @InjectRepository(VideoShot)
    private readonly shotRepo: Repository<VideoShot>,
    @InjectQueue('video-production')
    private readonly productionQueue: any,
  ) {}

  @Post('create')
  @ApiOperation({ summary: 'Initiate autonomous AI video production job' })
  async createProject(@Body() dto: CreateVideoProjectDto) {
    const project = this.projectRepo.create({
      workspaceId: 'ws-default',
      authorId: 'user-default',
      title: dto.title || 'Untitled AI Reel',
      rawPrompt: dto.rawPrompt,
      targetPlatform: dto.targetPlatform || 'instagram_reels',
      targetDurationSec: dto.targetDurationSec || 30,
      scriptLanguage: dto.scriptLanguage || 'english',
      voiceLanguage: dto.voiceLanguage || 'english',
      subtitleLanguage: dto.subtitleLanguage || 'english',
      currentStage: VideoStage.IDEA_ANALYSIS,
      stageProgressPercent: 0,
      overallProgressPercent: 0,
    });

    const saved = await this.projectRepo.save(project);

    // Enqueue background processing job
    await this.productionQueue.add('start', { projectId: saved.id });

    return {
      success: true,
      message: 'Video production job queued successfully',
      data: saved,
    };
  }

  @Get('projects/:id')
  @ApiOperation({ summary: 'Get video project state and real-time stage progress' })
  async getProject(@Param('id') id: string) {
    const project = await this.projectRepo.findOne({
      where: { id },
      relations: ['shots'],
    });

    if (!project) {
      throw new NotFoundException(`Video project ${id} not found`);
    }

    return {
      success: true,
      data: project,
    };
  }

  @Post('projects/:id/resume')
  @ApiOperation({ summary: 'Resume interrupted or failed video project pipeline' })
  async resumeProject(@Param('id') id: string) {
    const project = await this.projectRepo.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Video project ${id} not found`);
    }

    await this.productionQueue.add('resume', { projectId: id });

    return {
      success: true,
      message: 'Video production resume job queued',
    };
  }

  @Get('projects')
  @ApiOperation({ summary: 'List workspace video projects' })
  async listProjects(@Query('workspaceId') workspaceId: string = 'ws-default') {
    const projects = await this.projectRepo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    return {
      success: true,
      data: projects,
    };
  }
}
