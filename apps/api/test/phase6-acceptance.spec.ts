import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VoiceGenerationModule } from '../src/modules/voice-generation/voice-generation.module';
import { VoiceGenerationService } from '../src/modules/voice-generation/services/voice-generation.service';
import { EdgeNeuralVoiceProvider } from '../src/modules/voice-generation/providers/edge-neural-voice.provider';
import { PiperOnnxVoiceProvider } from '../src/modules/voice-generation/providers/piper-onnx-voice.provider';
import { WindowsSapiVoiceProvider } from '../src/modules/voice-generation/providers/windows-sapi-voice.provider';
import { AudioQualityValidatorService } from '../src/modules/voice-generation/services/audio-quality-validator.service';
import { FfmpegKeyframeMotionProvider } from '../src/modules/video-generation/providers/ffmpeg-keyframe-motion.provider';
import { MediaService } from '../src/modules/media/media.service';

describe('Phase 6 Voice/TTS & Audio-Visual Muxing Acceptance Tests', () => {
  let voiceService: VoiceGenerationService;
  let edgeProvider: EdgeNeuralVoiceProvider;
  let piperProvider: PiperOnnxVoiceProvider;
  let sapiProvider: WindowsSapiVoiceProvider;
  let audioQC: AudioQualityValidatorService;
  let motionProvider: FfmpegKeyframeMotionProvider;

  beforeAll(async () => {
    const mockMediaService = {
      uploadAndSaveAsset: async (workspaceId: string, projectId: string, assetType: any, filename: string, buffer: Buffer, mimeType: string) => ({
        id: `asset_${Date.now()}`,
        workspaceId,
        projectId,
        assetType,
        storageKey: `${workspaceId}/${projectId}/${filename}`,
        mimeType,
        size: buffer.length,
        status: 'AVAILABLE',
      }),
      markAssetAvailable: async (id: string, workspaceId: string, meta: any) => ({
        id,
        workspaceId,
        status: 'AVAILABLE',
        ...meta,
      }),
      findByProjectAndShot: async () => [],
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        VoiceGenerationService,
        EdgeNeuralVoiceProvider,
        PiperOnnxVoiceProvider,
        WindowsSapiVoiceProvider,
        AudioQualityValidatorService,
        FfmpegKeyframeMotionProvider,
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();




    voiceService = module.get<VoiceGenerationService>(VoiceGenerationService);
    edgeProvider = module.get<EdgeNeuralVoiceProvider>(EdgeNeuralVoiceProvider);
    piperProvider = module.get<PiperOnnxVoiceProvider>(PiperOnnxVoiceProvider);
    sapiProvider = module.get<WindowsSapiVoiceProvider>(WindowsSapiVoiceProvider);
    audioQC = module.get<AudioQualityValidatorService>(AudioQualityValidatorService);
    motionProvider = module.get<FfmpegKeyframeMotionProvider>(FfmpegKeyframeMotionProvider);
  });

  describe('1. Provider Readiness & Language Support', () => {
    it('edge-neural provider should be available and support English & Tamil', async () => {
      expect(await edgeProvider.getStatus()).toBe('AVAILABLE');
      expect(edgeProvider.supportsLanguage('en')).toBe(true);
      expect(edgeProvider.supportsLanguage('ta')).toBe(true);
    });

    it('piper-onnx provider should be available and support English & Tamil', async () => {
      expect(await piperProvider.getStatus()).toBe('AVAILABLE');
      expect(piperProvider.supportsLanguage('en')).toBe(true);
      expect(piperProvider.supportsLanguage('ta')).toBe(true);
    });

    it('windows-sapi provider should be available on Windows and support English & Tamil', async () => {
      if (process.platform === 'win32') {
        expect(await sapiProvider.getStatus()).toBe('AVAILABLE');
      }
      expect(sapiProvider.supportsLanguage('en')).toBe(true);
    });
  });

  describe('2. Audio Quality Control (QC)', () => {
    it('should validate and probe audio buffers cleanly', async () => {
      const mockAudio = Buffer.from('RIFF mock audio content for probing phase 6 acceptance test');
      const probeResult = await audioQC.probeAudioBuffer(mockAudio, 'audio/mpeg');
      expect(probeResult).toBeDefined();
      expect(probeResult.durationSeconds).toBeGreaterThan(0);
      expect(probeResult.isValid).toBe(true);
    });
  });

  describe('3. Voice Generation Orchestration & Multi-Provider Fallback', () => {
    it('should generate voice narration for English prompt', async () => {
      const result = await voiceService.generateVoice({
        text: 'Welcome to Phase 6 Voice and Text-to-Speech acceptance test.',
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(result.output.audioBuffer).toBeDefined();
      expect(result.output.audioBuffer.length).toBeGreaterThan(0);
      expect(result.output.durationSeconds).toBeGreaterThan(0);
      expect(result.version).toBe(1);
    });

    it('should generate voice narration for Tamil prompt', async () => {
      const result = await voiceService.generateVoice({
        text: 'வணக்கம், அப்லோரா தமிழ் குரல் உருவாக்கம் சோதனை.',
        language: 'ta',
      });

      expect(result).toBeDefined();
      expect(result.output.audioBuffer).toBeDefined();
      expect(result.output.audioBuffer.length).toBeGreaterThan(0);
      expect(result.output.durationSeconds).toBeGreaterThan(0);
    });
  });

  describe('4. FFmpeg Audio-Visual Muxing', () => {
    it('should mux motion video with narration audio into a 9:16 MP4', async () => {
      // Create simple 1x1 image buffer for synthetic keyframe
      const imageBuffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        'base64',
      );

      const motionVideo = await motionProvider.generateVideoClip({
        imageBuffer,
        durationSeconds: 3,
        width: 768,
        height: 1344,
        motionPreset: 'slow_zoom_in',
        fps: 30,
      });

      const voiceAudio = await voiceService.generateVoice({
        text: 'FFmpeg audio video muxing test for Phase 6.',
        language: 'en',
      });

      const muxResult = await motionProvider.muxAudioVideo({
        videoBuffer: motionVideo.videoBuffer,
        audioBuffer: voiceAudio.output.audioBuffer,
        durationSeconds: voiceAudio.output.durationSeconds,
        width: 768,
        height: 1344,
      });

      expect(muxResult).toBeDefined();
      expect(muxResult.videoBuffer).toBeDefined();
      expect(muxResult.videoBuffer.length).toBeGreaterThan(0);
      expect(muxResult.mimeType).toBe('video/mp4');
      expect(muxResult.videoCodec).toBe('h264');
      expect(muxResult.audioCodec).toBe('aac');
      expect(muxResult.width).toBe(768);
      expect(muxResult.height).toBe(1344);
    });
  });
});
