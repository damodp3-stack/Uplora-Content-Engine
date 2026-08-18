import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SoundLibraryService } from './services/sound-library.service';
import { AudioQcService } from './services/audio-qc.service';
import { AudioMasteringService } from './services/audio-mastering.service';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [MediaModule, EventEmitterModule.forRoot()],
  providers: [SoundLibraryService, AudioQcService, AudioMasteringService],
  exports: [SoundLibraryService, AudioQcService, AudioMasteringService],
})
export class AudioStudioModule {}
