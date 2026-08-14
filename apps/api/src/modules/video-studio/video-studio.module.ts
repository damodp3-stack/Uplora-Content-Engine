import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BullModule } from "@nestjs/bull";
import { VideoProject } from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoDeliverableVersion } from "./entities/video-deliverable-version.entity";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";
import { VideoProductionProcessor } from "./video-production.processor";
import { VideoStudioController } from "./video-studio.controller";
import { RealtimeModule } from "../realtime/realtime.module";
import { AIEngineModule } from "../ai-engine/ai-engine.module";
import { MediaModule } from "../media/media.module";

// Creative Agents & Providers
import { CreativeDirectorAgent } from "./agents/creative-director.agent";
import { ResearchAgent } from "./agents/research.agent";
import { TavilyResearchProvider } from "./providers/tavily-research.provider";
import { ContentStrategistAgent } from "./agents/content-strategist.agent";
import { ScriptWriterAgent } from "./agents/script-writer.agent";
import { StoryboardDirectorAgent } from "./agents/storyboard-director.agent";
import { VisualDirectorAgent } from "./agents/visual-director.agent";
import { CharacterAssetAgent } from "./agents/character-asset.agent";
import { QualityEvaluatorAgent } from "./agents/quality-evaluator.agent";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VideoProject,
      VideoShot,
      VideoDeliverableVersion,
    ]),
    BullModule.registerQueue({
      name: "video-production",
    }),
    RealtimeModule,
    AIEngineModule,
    MediaModule,
  ],
  controllers: [VideoStudioController],
  providers: [
    VideoProductionOrchestrator,
    VideoProductionProcessor,
    CreativeDirectorAgent,
    ResearchAgent,
    TavilyResearchProvider,
    ContentStrategistAgent,
    ScriptWriterAgent,
    StoryboardDirectorAgent,
    VisualDirectorAgent,
    CharacterAssetAgent,
    QualityEvaluatorAgent,
  ],
  exports: [
    VideoProductionOrchestrator,
    CreativeDirectorAgent,
    ResearchAgent,
    TavilyResearchProvider,
    ContentStrategistAgent,
    ScriptWriterAgent,
    StoryboardDirectorAgent,
    VisualDirectorAgent,
    CharacterAssetAgent,
    QualityEvaluatorAgent,
  ],
})
export class VideoStudioModule {}
