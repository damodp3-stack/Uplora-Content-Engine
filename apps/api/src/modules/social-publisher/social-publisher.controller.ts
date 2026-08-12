import { Controller, Post, Get, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  SocialPublisherService,
  PublishPayload,
} from "./social-publisher.service";

@ApiTags("Social Publisher")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("social-publisher")
export class SocialPublisherController {
  constructor(
    private readonly socialPublisherService: SocialPublisherService,
  ) {}

  @Post("publish")
  @ApiOperation({
    summary: "Publish content immediately to selected social platforms",
  })
  async publish(@Body() payload: PublishPayload) {
    return this.socialPublisherService.publishToPlatforms(payload);
  }

  @Get("accounts")
  @ApiOperation({
    summary: "Get list of connected social media platform accounts",
  })
  async getConnectedAccounts(@Req() req: any) {
    return this.socialPublisherService.getConnectedAccounts(
      req.user?.activeWorkspaceId || "default-workspace",
    );
  }
}
