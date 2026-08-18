import { Test, TestingModule } from '@nestjs/testing';
import { AudioQualityValidatorService } from './audio-quality-validator.service';

describe('AudioQualityValidatorService', () => {
  let service: AudioQualityValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioQualityValidatorService],
    }).compile();

    service = module.get<AudioQualityValidatorService>(AudioQualityValidatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException when audio buffer is empty', async () => {
    await expect(service.probeAudioBuffer(Buffer.alloc(0))).rejects.toThrow();
  });

  it('should probe non-empty audio buffer and return valid result', async () => {
    const dummyBuffer = Buffer.from('RIFF mock audio buffer data for testing audio validator');
    const result = await service.probeAudioBuffer(dummyBuffer, 'audio/wav');
    expect(result).toBeDefined();
    expect(result.sizeBytes).toBe(dummyBuffer.length);
    expect(result.durationSeconds).toBeGreaterThan(0);
  });
});
