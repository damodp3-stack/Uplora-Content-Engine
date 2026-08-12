import { Controller, Get, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { WorkspaceService } from "./workspace.service";

@ApiTags("Workspace")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("workspace")
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Get("current")
  @ApiOperation({ summary: "Get current workspace profile and team settings" })
  async getCurrent(@Req() req: any) {
    return this.workspaceService.getWorkspace(
      req.user?.activeWorkspaceId || "default-workspace",
    );
  }
}
