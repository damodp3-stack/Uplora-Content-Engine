import { Test, TestingModule } from '@nestjs/testing';
import { FfmpegKeyframeMotionProvider } from './ffmpeg-keyframe-motion.provider';
import { MotionPreset } from '../interfaces/keyframe-motion-provider.interface';

describe('FfmpegKeyframeMotionProvider', () => {
  let provider: FfmpegKeyframeMotionProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FfmpegKeyframeMotionProvider],
    }).compile();

    provider = module.get<FfmpegKeyframeMotionProvider>(FfmpegKeyframeMotionProvider);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
    expect(provider.providerName).toBe('keyframe-motion');
  });

  it('should report status AVAILABLE when FFmpeg is detected', async () => {
    const status = await provider.getStatus();
    expect(status).toBe('AVAILABLE');
  });

  it('should construct correct FFmpeg filters for all motion presets', () => {
    const presets: MotionPreset[] = [
      'slow_zoom_in',
      'slow_zoom_out',
      'pan_left',
      'pan_right',
      'pan_up',
      'pan_down',
      'subtle_parallax',
      'static_hold',
    ];

    for (const preset of presets) {
      const filter = provider.buildFfmpegFilter(preset, 576, 1024, 30, 3);
      expect(filter).toBeDefined();
      expect(typeof filter).toBe('string');
      expect(filter.length).toBeGreaterThan(10);
      if (preset !== 'static_hold') {
        expect(filter).toContain('zoompan');
      } else {
        expect(filter).toContain('scale');
      }
    }
  });

  it('should throw error when given empty image buffer', async () => {
    await expect(
      provider.generateVideoClip({
        imageBuffer: Buffer.alloc(0),
        durationSeconds: 3,
        width: 576,
        height: 1024,
      }),
    ).rejects.toThrow();
  });
});
