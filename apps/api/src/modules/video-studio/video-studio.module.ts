import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { VideoProject } from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";
import { VideoProductionProcessor } from "./video-production.processor";
import { VideoStudioController } from "./video-studio.controller";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoProject, VideoShot]),
    BullModule.registerQueue({
      name: "video-production",
    }),
    RealtimeModule,
  ],
  controllers: [VideoStudioController],
  providers: [VideoProductionOrchestrator, VideoProductionProcessor],
  exports: [VideoProductionOrchestrator],
})
export class VideoStudioModule {}
