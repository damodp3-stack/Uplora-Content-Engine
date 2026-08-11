import {
  Controller, Get, Post, Put, Delete, Patch,
  Body, Param, Query, UseGuards, Req,
  HttpStatus, HttpCode, ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ContentService } from './content.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { QueryContentDto } from './dto/query-content.dto';

@ApiTags('Content')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post()
  @ApiOperation({ summary: 'Create new content' })
  @ApiResponse({ status: 201, description: 'Content created successfully' })
  async create(@Body() dto: CreateContentDto, @Req() req: any) {
    return this.contentService.create(
      dto,
      req.user?.id || 'dev-user-id',
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all content with filters and pagination' })
  async findAll(@Query() query: QueryContentDto, @Req() req: any) {
    return this.contentService.findAll(
      query,
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getStats(@Req() req: any) {
    return this.contentService.getDashboardStats(
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single content by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.contentService.findOne(
      id,
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update content' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDto,
    @Req() req: any,
  ) {
    return this.contentService.update(
      id,
      dto,
      req.user?.id || 'dev-user-id',
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete content' })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.contentService.delete(
      id,
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'Publish content immediately' })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.contentService.publish(
      id,
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Patch(':id/schedule')
  @ApiOperation({ summary: 'Schedule content for future publishing' })
  async schedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('scheduledAt') scheduledAt: Date,
    @Req() req: any,
  ) {
    return this.contentService.schedule(
      id,
      scheduledAt,
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get version history' })
  async getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ) {
    return this.contentService.getVersionHistory(
      id,
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }

  @Patch(':id/versions/:versionId/restore')
  @ApiOperation({ summary: 'Restore a previous version' })
  async restoreVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Req() req: any,
  ) {
    return this.contentService.restoreVersion(
      id,
      versionId,
      req.user?.id || 'dev-user-id',
      req.user?.activeWorkspaceId || 'default-workspace',
    );
  }
}
