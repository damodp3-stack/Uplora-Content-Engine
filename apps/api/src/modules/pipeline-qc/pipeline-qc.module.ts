import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PipelineQcService } from './services/pipeline-qc.service';
import { SelfHealingOrchestratorService } from './services/self-healing.orchestrator';
import { StorageHygieneService } from './services/storage-hygiene.service';
import { VoiceGenerationModule } from '../voice-generation/voice-generation.module';
import { AudioStudioModule } from '../audio-studio/audio-studio.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    VoiceGenerationModule,
    AudioStudioModule,
    MediaModule,
    EventEmitterModule.forRoot(),
  ],
  providers: [PipelineQcService, SelfHealingOrchestratorService, StorageHygieneService],
  exports: [PipelineQcService, SelfHealingOrchestratorService, StorageHygieneService],
})
export class PipelineQcModule {}
