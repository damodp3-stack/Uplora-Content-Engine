import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { VideoProject } from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";
import { VideoProductionProcessor } from "./video-production.processor";
import { VideoStudioController } from "./video-studio.controller";
import { RealtimeModule } from "../realtime/realtime.module";
import { AIEngineModule } from "../ai-engine/ai-engine.module";

// Creative Agents
import { CreativeDirectorAgent } from "./agents/creative-director.agent";
import { ContentStrategistAgent } from "./agents/content-strategist.agent";
import { ScriptWriterAgent } from "./agents/script-writer.agent";
import { StoryboardDirectorAgent } from "./agents/storyboard-director.agent";
import { VisualDirectorAgent } from "./agents/visual-director.agent";
import { CharacterAssetAgent } from "./agents/character-asset.agent";

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoProject, VideoShot]),
    BullModule.registerQueue({
      name: "video-production",
    }),
    RealtimeModule,
    AIEngineModule,
  ],
  controllers: [VideoStudioController],
  providers: [
    VideoProductionOrchestrator,
    VideoProductionProcessor,
    CreativeDirectorAgent,
    ContentStrategistAgent,
    ScriptWriterAgent,
    StoryboardDirectorAgent,
    VisualDirectorAgent,
    CharacterAssetAgent,
  ],
  exports: [
    VideoProductionOrchestrator,
    CreativeDirectorAgent,
    ContentStrategistAgent,
    ScriptWriterAgent,
    StoryboardDirectorAgent,
    VisualDirectorAgent,
    CharacterAssetAgent,
  ],
})
export class VideoStudioModule {}
