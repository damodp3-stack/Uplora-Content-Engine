import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bull";
import { ImageGenerationController } from "./image-generation.controller";
import { ImageGenerationService } from "./image-generation.service";
import { ImagePromptBuilderService } from "./image-prompt-builder.service";
import { ImageQualityValidatorService } from "./image-quality-validator.service";
import { GeminiImageProvider } from "./providers/gemini-image.provider";
import { FalImageProvider } from "./providers/fal-image.provider";
import { OpenAIImageProvider } from "./providers/openai-image.provider";
import { PollinationsImageProvider } from "./providers/pollinations-image.provider";
import { ImageGenerationProcessor } from "./image-generation.processor";
import { MediaModule } from "../media/media.module";
import { RealtimeModule } from "../realtime/realtime.module";

@Module({
  imports: [
    ConfigModule,
    MediaModule,
    RealtimeModule,
    BullModule.registerQueue({
      name: "image-generation",
    }),
  ],
  controllers: [ImageGenerationController],
  providers: [
    ImageGenerationService,
    ImagePromptBuilderService,
    ImageQualityValidatorService,
    GeminiImageProvider,
    FalImageProvider,
    OpenAIImageProvider,
    PollinationsImageProvider,
    ImageGenerationProcessor,
  ],
  exports: [
    ImageGenerationService,
    ImagePromptBuilderService,
    ImageQualityValidatorService,
    GeminiImageProvider,
    FalImageProvider,
    OpenAIImageProvider,
    PollinationsImageProvider,
  ],
})
export class ImageGenerationModule {}
