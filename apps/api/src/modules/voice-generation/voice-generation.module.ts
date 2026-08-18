import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EdgeNeuralVoiceProvider } from './providers/edge-neural-voice.provider';
import { PiperOnnxVoiceProvider } from './providers/piper-onnx-voice.provider';
import { WindowsSapiVoiceProvider } from './providers/windows-sapi-voice.provider';
import { AudioQualityValidatorService } from './services/audio-quality-validator.service';
import { VoiceGenerationService } from './services/voice-generation.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule, EventEmitterModule.forRoot()],
  providers: [
    AudioQualityValidatorService,
    EdgeNeuralVoiceProvider,
    PiperOnnxVoiceProvider,
    WindowsSapiVoiceProvider,
    VoiceGenerationService,
  ],
  exports: [
    AudioQualityValidatorService,
    EdgeNeuralVoiceProvider,
    PiperOnnxVoiceProvider,
    WindowsSapiVoiceProvider,
    VoiceGenerationService,
  ],
})
export class VoiceGenerationModule {}

