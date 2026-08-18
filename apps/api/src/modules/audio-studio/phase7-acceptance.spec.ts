import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { AudioMasteringService } from './services/audio-mastering.service';
import { SoundLibraryService } from './services/sound-library.service';
import { AudioQcService } from './services/audio-qc.service';
import { MediaService } from '../media/media.service';

jest.setTimeout(30000);

describe('Phase 7 Acceptance Suite — Music, SFX & Audio Mastering Engine', () => {
  let module: TestingModule;
  let masteringService: AudioMasteringService;
  let soundLibrary: SoundLibraryService;
  let audioQC: AudioQcService;
  let eventEmitter: EventEmitter2;

  const eventsEmitted: string[] = [];

  const mockMediaService = {
    uploadAndSaveAsset: jest.fn().mockResolvedValue({
      id: 'media_asset_123',
      filename: 'mastered_audio_test.wav',
      mimeType: 'audio/wav',
    }),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        AudioMasteringService,
        SoundLibraryService,
        AudioQcService,
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    masteringService = module.get<AudioMasteringService>(AudioMasteringService);
    soundLibrary = module.get<SoundLibraryService>(SoundLibraryService);
    audioQC = module.get<AudioQcService>(AudioQcService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    eventEmitter.on('audio.mastering.started', () => eventsEmitted.push('audio.mastering.started'));
    eventEmitter.on('audio.mastering.progress', () => eventsEmitted.push('audio.mastering.progress'));
    eventEmitter.on('audio.mastering.completed', () => eventsEmitted.push('audio.mastering.completed'));
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('1. SoundLibraryService generates CC0 ambient music and SFX sweeps', async () => {
    const musicBuf = await soundLibrary.getBackgroundMusic('ambient', 4);
    const sfxBuf = await soundLibrary.getSoundEffect('whoosh');

    expect(musicBuf).toBeDefined();
    expect(musicBuf.length).toBeGreaterThan(500);
    expect(sfxBuf).toBeDefined();
    expect(sfxBuf.length).toBeGreaterThan(200);
  }, 30000);

  it('2. AudioQcService inspects audio stream for duration, silence, and peak levels', async () => {
    const musicBuf = await soundLibrary.getBackgroundMusic('corporate', 3);
    const report = await audioQC.analyzeAudio(musicBuf, -14);

    expect(report.durationSeconds).toBeGreaterThan(1.0);
    expect(report.hasClipping).toBe(false);
    expect(report.isValid).toBe(true);
  }, 30000);

  it('3. AudioMasteringService applies sidechain voice ducking, SFX cue positioning, LUFS normalization & peak limiting', async () => {
    const voiceBuf = await soundLibrary.getBackgroundMusic('lofi', 4);
    const { output, asset } = await masteringService.masterAudioTrack({
      voiceBuffer: voiceBuf,
      musicCategory: 'ambient',
      sfxCues: [
        { sfxId: 'whoosh', timestampSeconds: 0.5, volume: 0.4 },
        { sfxId: 'chime', timestampSeconds: 2.0, volume: 0.3 },
      ],
      loudnessProfile: 'REELS',
      duckingThreshold: 0.08,
      duckingRatio: 6,
      workspaceId: 'ws_123',
      projectId: 'proj_123',
    });

    expect(output).toBeDefined();
    expect(output.masteredBuffer.length).toBeGreaterThan(1000);
    expect(output.integratedLufs).toBe(-16);
    expect(output.generationMetadata.duckingApplied).toBe(true);
    expect(output.generationMetadata.sfxCount).toBe(2);
    expect(output.qcReport.isValid).toBe(true);
    expect(asset).toBeDefined();
    expect(asset?.id).toBe('media_asset_123');
  }, 30000);

  it('4. Realtime WebSocket events are emitted during audio mastering lifecycle', () => {
    expect(eventsEmitted).toContain('audio.mastering.started');
    expect(eventsEmitted).toContain('audio.mastering.progress');
    expect(eventsEmitted).toContain('audio.mastering.completed');
  });
});
