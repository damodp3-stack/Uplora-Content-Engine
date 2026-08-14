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
import { AssetType } from "./entities/media-asset.entity";

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
    const workspaceId = req.user?.activeWorkspaceId || "default-workspace";
    const filename = file?.originalname || `asset_${Date.now()}.png`;
    const mimeType = file?.mimetype || "image/png";
    const buffer = file?.buffer || Buffer.from("uploaded-file");
    const assetType = mimeType.startsWith("video") ? AssetType.VIDEO : AssetType.IMAGE;

    return this.mediaService.uploadAndSaveAsset(
      workspaceId,
      "default-project",
      assetType,
      filename,
      buffer,
      mimeType,
    );
  }
}
