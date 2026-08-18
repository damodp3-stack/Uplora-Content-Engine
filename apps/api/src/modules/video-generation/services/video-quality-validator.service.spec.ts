import { Test, TestingModule } from '@nestjs/testing';
import { VideoQualityValidatorService } from './video-quality-validator.service';

describe('VideoQualityValidatorService', () => {
  let service: VideoQualityValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VideoQualityValidatorService],
    }).compile();

    service = module.get<VideoQualityValidatorService>(VideoQualityValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error for empty buffer input', async () => {
    await expect(service.validateVideo(Buffer.alloc(0))).rejects.toThrow();
  });

  it('should detect ffprobe executable path', () => {
    const probePath = service.getFfprobePath();
    expect(probePath).toBeDefined();
    expect(typeof probePath).toBe('string');
  });
});
