import { Test, TestingModule } from '@nestjs/testing';
import { SoundLibraryService } from './sound-library.service';

describe('SoundLibraryService', () => {
  let service: SoundLibraryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SoundLibraryService],
    }).compile();

    service = module.get<SoundLibraryService>(SoundLibraryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should synthesize background music audio buffer cleanly', async () => {
    const musicBuf = await service.getBackgroundMusic('ambient', 2);
    expect(musicBuf).toBeDefined();
    expect(Buffer.isBuffer(musicBuf)).toBe(true);
    expect(musicBuf.length).toBeGreaterThan(100);
  });

  it('should synthesize sound effect audio buffer cleanly', async () => {
    const sfxBuf = await service.getSoundEffect('whoosh');
    expect(sfxBuf).toBeDefined();
    expect(Buffer.isBuffer(sfxBuf)).toBe(true);
    expect(sfxBuf.length).toBeGreaterThan(100);
  });
});
