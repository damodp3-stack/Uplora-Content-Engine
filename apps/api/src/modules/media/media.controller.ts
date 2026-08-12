import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MediaService } from "./media.service";

@ApiTags("Media")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("media")
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  @ApiOperation({ summary: "Get workspace media library assets" })
  async getMediaLibrary(@Req() req: any) {
    return this.mediaService.getMediaLibrary(
      req.user?.activeWorkspaceId || "default-workspace",
    );
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload an image or video asset" })
  async uploadFile(@UploadedFile() file: any, @Req() req: any) {
    return this.mediaService.uploadMedia(
      file,
      req.user?.activeWorkspaceId || "default-workspace",
    );
  }
}
