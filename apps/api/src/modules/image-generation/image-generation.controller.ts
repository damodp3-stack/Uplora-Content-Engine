import { Controller, Post, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ImageGenerationService } from "./image-generation.service";

@ApiTags("Image Generation")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("image-generation")
export class ImageGenerationController {
  constructor(private readonly imageService: ImageGenerationService) {}

  @Post("keyframe")
  @ApiOperation({ summary: "Generate real keyframe image asset for a video shot" })
  async generateKeyframe(@Body() body: any, @Req() req: any) {
    const workspaceId = req.user?.activeWorkspaceId || body.workspaceId || "default-workspace";
    return await this.imageService.generateKeyframeForShot({
      workspaceId,
      projectId: body.projectId,
      shotId: body.shotId,
      shotPromptInput: body.shotPromptInput,
    });
  }
}
