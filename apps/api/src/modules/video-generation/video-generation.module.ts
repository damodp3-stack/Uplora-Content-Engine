import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { FfmpegKeyframeMotionProvider } from './providers/ffmpeg-keyframe-motion.provider';
import { VideoQualityValidatorService } from './services/video-quality-validator.service';
import { VideoGenerationService } from './video-generation.service';
import { VideoGenerationProcessor } from './video-generation.processor';
import { MediaModule } from '../media/media.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    MediaModule,
    RealtimeModule,
    BullModule.registerQueue({
      name: 'video-generation',
    }),
  ],
  providers: [
    FfmpegKeyframeMotionProvider,
    VideoQualityValidatorService,
    VideoGenerationService,
    VideoGenerationProcessor,
  ],
  exports: [
    VideoGenerationService,
    FfmpegKeyframeMotionProvider,
    VideoQualityValidatorService,
  ],
})
export class VideoGenerationModule {}
