import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MediaService } from "./media.service";
import { MediaController } from "./media.controller";
import { MediaAsset } from "./entities/media-asset.entity";
import {
  MEDIA_STORAGE_PROVIDER,
  createStorageProvider,
} from "./providers/storage-provider.factory";

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaAsset]),
    ConfigModule,
  ],
  controllers: [MediaController],
  providers: [
    MediaService,
    {
      provide: MEDIA_STORAGE_PROVIDER,
      useFactory: (configService: ConfigService) =>
        createStorageProvider(configService),
      inject: [ConfigService],
    },
  ],
  exports: [MediaService, MEDIA_STORAGE_PROVIDER],
})
export class MediaModule {}
