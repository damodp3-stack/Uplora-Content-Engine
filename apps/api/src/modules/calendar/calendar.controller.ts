import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CalendarService } from "./calendar.service";

@ApiTags("Calendar")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("calendar")
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get("events")
  @ApiOperation({
    summary: "Get calendar events for scheduled and published content",
  })
  async getEvents(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req: any,
  ) {
    return this.calendarService.getScheduledEvents(
      req.user?.activeWorkspaceId || "default-workspace",
      startDate,
      endDate,
    );
  }
}
