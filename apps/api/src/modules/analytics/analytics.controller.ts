import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get workspace level analytics overview and charts' })
  async getOverview(@Query('timeframe') timeframe: string, @Req() req: any) {
    return this.analyticsService.getOverviewMetrics(
      req.user?.activeWorkspaceId || 'default-workspace',
      timeframe,
    );
  }

  @Get('content/:id')
  @ApiOperation({ summary: 'Get performance analytics for a specific content item' })
  async getContentPerformance(@Param('id') contentId: string) {
    return this.analyticsService.getContentPerformance(contentId);
  }
}
