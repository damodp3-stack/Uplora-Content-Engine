import { Test, TestingModule } from '@nestjs/testing';
import { AudioQcService } from './audio-qc.service';
import { SoundLibraryService } from './sound-library.service';

describe('AudioQcService', () => {
  let service: AudioQcService;
  let soundLibrary: SoundLibraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioQcService, SoundLibraryService],
    }).compile();

    service = module.get<AudioQcService>(AudioQcService);
    soundLibrary = module.get<SoundLibraryService>(SoundLibraryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should analyze audio buffer and return valid report', async () => {
    const audioBuf = await soundLibrary.getBackgroundMusic('ambient', 2);
    const report = await service.analyzeAudio(audioBuf, -14);

    expect(report).toBeDefined();
    expect(report.durationSeconds).toBeGreaterThan(0);
    expect(report.isValid).toBe(true);
  });
});
