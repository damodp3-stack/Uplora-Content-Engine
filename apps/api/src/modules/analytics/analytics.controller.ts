import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Analytics")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Get workspace analytics overview metrics" })
  async getOverview(
    @Query("workspaceId") workspaceId: string = "ws-default",
    @Query("timeframe") timeframe: string = "30d",
  ) {
    return this.analyticsService.getOverviewMetrics(workspaceId, timeframe);
  }

  @Get("content/:id")
  @ApiOperation({
    summary: "Get detailed performance metrics for a specific content item",
  })
  async getContentPerformance(@Param("id") contentId: string) {
    return this.analyticsService.getContentPerformance(contentId);
  }

  @Get("ai-summary")
  @ApiOperation({ summary: "Get AI cost savings and generation stats" })
  async getAISummary(@Query("workspaceId") workspaceId: string = "ws-default") {
    return this.analyticsService.getAISummary(workspaceId);
  }
}
