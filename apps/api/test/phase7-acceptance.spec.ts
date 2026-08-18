import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AudioStudioModule } from '../src/modules/audio-studio/audio-studio.module';
import { AudioMasteringService } from '../src/modules/audio-studio/services/audio-mastering.service';
import { SoundLibraryService } from '../src/modules/audio-studio/services/sound-library.service';
import { AudioQcService } from '../src/modules/audio-studio/services/audio-qc.service';

describe('Phase 7 Acceptance Suite — Music, SFX & Audio Mastering Engine', () => {
  let module: TestingModule;
  let masteringService: AudioMasteringService;
  let soundLibrary: SoundLibraryService;
  let audioQC: AudioQcService;
  let eventEmitter: EventEmitter2;

  const eventsEmitted: string[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AudioStudioModule],
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
    await module.close();
  });

  it('1. SoundLibraryService generates CC0 ambient music and SFX sweeps', async () => {
    const musicBuf = await soundLibrary.getBackgroundMusic('ambient', 4);
    const sfxBuf = await soundLibrary.getSoundEffect('whoosh');

    expect(musicBuf).toBeDefined();
    expect(musicBuf.length).toBeGreaterThan(500);
    expect(sfxBuf).toBeDefined();
    expect(sfxBuf.length).toBeGreaterThan(200);
  });

  it('2. AudioQcService inspects audio stream for duration, silence, and peak levels', async () => {
    const musicBuf = await soundLibrary.getBackgroundMusic('corporate', 3);
    const report = await audioQC.analyzeAudio(musicBuf, -14);

    expect(report.durationSeconds).toBeGreaterThan(1.0);
    expect(report.hasClipping).toBe(false);
    expect(report.isValid).toBe(true);
  });

  it('3. AudioMasteringService applies sidechain voice ducking, SFX cue positioning, LUFS normalization & peak limiting', async () => {
    const voiceBuf = await soundLibrary.getBackgroundMusic('lofi', 4);
    const { output } = await masteringService.masterAudioTrack({
      voiceBuffer: voiceBuf,
      musicCategory: 'ambient',
      sfxCues: [
        { sfxId: 'whoosh', timestampSeconds: 0.5, volume: 0.4 },
        { sfxId: 'chime', timestampSeconds: 2.0, volume: 0.3 },
      ],
      loudnessProfile: 'REELS',
      duckingThreshold: 0.08,
      duckingRatio: 6,
    });

    expect(output).toBeDefined();
    expect(output.masteredBuffer.length).toBeGreaterThan(1000);
    expect(output.integratedLufs).toBe(-16);
    expect(output.generationMetadata.duckingApplied).toBe(true);
    expect(output.generationMetadata.sfxCount).toBe(2);
    expect(output.qcReport.isValid).toBe(true);
  });

  it('4. Realtime WebSocket events are emitted during audio mastering lifecycle', () => {
    expect(eventsEmitted).toContain('audio.mastering.started');
    expect(eventsEmitted).toContain('audio.mastering.progress');
    expect(eventsEmitted).toContain('audio.mastering.completed');
  });
});
