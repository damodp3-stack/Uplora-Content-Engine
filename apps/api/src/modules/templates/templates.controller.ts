import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TemplatesService } from "./templates.service";

@ApiTags("Templates")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  @ApiOperation({ summary: "Get prebuilt content generation templates" })
  async getTemplates() {
    return this.templatesService.getPrebuiltTemplates();
  }
}
