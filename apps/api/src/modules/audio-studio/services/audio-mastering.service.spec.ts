import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AudioMasteringService } from './audio-mastering.service';
import { SoundLibraryService } from './sound-library.service';
import { AudioQcService } from './audio-qc.service';

jest.setTimeout(30000);

describe('AudioMasteringService', () => {
  let service: AudioMasteringService;
  let soundLibrary: SoundLibraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioMasteringService,
        SoundLibraryService,
        AudioQcService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AudioMasteringService>(AudioMasteringService);
    soundLibrary = module.get<SoundLibraryService>(SoundLibraryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should resolve loudness profile targets correctly', () => {
    const reels = service.resolveLoudnessTarget('REELS');
    expect(reels.targetLufs).toBe(-16);

    const shorts = service.resolveLoudnessTarget('SHORTS');
    expect(shorts.targetLufs).toBe(-14);

    const podcast = service.resolveLoudnessTarget('PODCAST');
    expect(podcast.targetLufs).toBe(-18);

    const custom = service.resolveLoudnessTarget('CUSTOM', -12);
    expect(custom.targetLufs).toBe(-12);
  });

  it('should perform audio mastering cleanly', async () => {
    const voiceBuf = await soundLibrary.getBackgroundMusic('corporate', 3);
    const result = await service.masterAudioTrack({
      voiceBuffer: voiceBuf,
      loudnessProfile: 'SHORTS',
      sfxCues: [{ sfxId: 'whoosh', timestampSeconds: 0.5, volume: 0.3 }],
    });

    expect(result).toBeDefined();
    expect(result.output.masteredBuffer).toBeDefined();
    expect(result.output.integratedLufs).toBe(-14);
    expect(result.output.qcReport.isValid).toBe(true);
  }, 30000);
});
