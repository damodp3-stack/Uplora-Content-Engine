import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VoiceGenerationService } from './voice-generation.service';
import { EdgeNeuralVoiceProvider } from '../providers/edge-neural-voice.provider';
import { PiperOnnxVoiceProvider } from '../providers/piper-onnx-voice.provider';
import { WindowsSapiVoiceProvider } from '../providers/windows-sapi-voice.provider';
import { AudioQualityValidatorService } from './audio-quality-validator.service';
import { MediaService } from '../../media/media.service';

describe('VoiceGenerationService', () => {
  let service: VoiceGenerationService;
  let edgeNeuralProvider: jest.Mocked<EdgeNeuralVoiceProvider>;
  let piperOnnxProvider: jest.Mocked<PiperOnnxVoiceProvider>;
  let windowsSapiProvider: jest.Mocked<WindowsSapiVoiceProvider>;
  let audioValidator: jest.Mocked<AudioQualityValidatorService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockAudioBuffer = Buffer.from('RIFF mock audio buffer content with enough bytes');

  beforeEach(async () => {
    edgeNeuralProvider = {
      providerName: 'edge-neural',
      getStatus: jest.fn().mockResolvedValue('AVAILABLE'),
      supportsLanguage: jest.fn().mockReturnValue(true),
      generateVoice: jest.fn().mockResolvedValue({
        audioBuffer: mockAudioBuffer,
        mimeType: 'audio/mpeg',
        durationSeconds: 4.5,
        sizeBytes: mockAudioBuffer.length,
        sampleRate: 24000,
        channels: 1,
        codec: 'mp3',
        sha256: 'abc123hash',
        generationMetadata: {
          provider: 'edge-neural',
          voiceId: 'en-US-AvaNeural',
          language: 'en',
          latencyMs: 150,
        },
      }),
    } as any;

    piperOnnxProvider = {
      providerName: 'piper-onnx',
      getStatus: jest.fn().mockResolvedValue('AVAILABLE'),
      supportsLanguage: jest.fn().mockReturnValue(true),
      generateVoice: jest.fn().mockResolvedValue({
        audioBuffer: mockAudioBuffer,
        mimeType: 'audio/mpeg',
        durationSeconds: 4.5,
        sizeBytes: mockAudioBuffer.length,
        sampleRate: 24000,
        channels: 1,
        codec: 'mp3',
        sha256: 'abc123hash',
        generationMetadata: {
          provider: 'piper-onnx',
          voiceId: 'en_US-lessac-medium',
          language: 'en',
          latencyMs: 100,
        },
      }),
    } as any;

    windowsSapiProvider = {
      providerName: 'windows-sapi',
      getStatus: jest.fn().mockResolvedValue('AVAILABLE'),
      supportsLanguage: jest.fn().mockReturnValue(true),
      generateVoice: jest.fn().mockResolvedValue({
        audioBuffer: mockAudioBuffer,
        mimeType: 'audio/wav',
        durationSeconds: 4.5,
        sizeBytes: mockAudioBuffer.length,
        sampleRate: 22050,
        channels: 1,
        codec: 'pcm_s16le',
        sha256: 'abc123hash',
        generationMetadata: {
          provider: 'windows-sapi',
          voiceId: 'Microsoft Zira Desktop',
          language: 'en',
          latencyMs: 50,
        },
      }),
    } as any;

    audioValidator = {
      probeAudioBuffer: jest.fn().mockResolvedValue({
        durationSeconds: 4.5,
        sampleRate: 24000,
        channels: 1,
        codec: 'mp3',
        bitrate: 64000,
        sizeBytes: mockAudioBuffer.length,
        mimeType: 'audio/mpeg',
        isValid: true,
      }),
    } as any;

    eventEmitter = {
      emit: jest.fn(),
    } as any;

    const mockMediaService = {
      uploadAndSaveAsset: jest.fn().mockResolvedValue({ id: 'asset_123' }),
      markAssetAvailable: jest.fn().mockResolvedValue({ id: 'asset_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceGenerationService,
        { provide: EdgeNeuralVoiceProvider, useValue: edgeNeuralProvider },
        { provide: PiperOnnxVoiceProvider, useValue: piperOnnxProvider },
        { provide: WindowsSapiVoiceProvider, useValue: windowsSapiProvider },
        { provide: AudioQualityValidatorService, useValue: audioValidator },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();


    service = module.get<VoiceGenerationService>(VoiceGenerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list available providers', () => {
    const providers = service.getAvailableProviders();
    expect(providers).toContain('edge-neural');
    expect(providers).toContain('piper-onnx');
    expect(providers).toContain('windows-sapi');
  });

  it('should synthesize voice using primary provider edge-neural and emit events', async () => {
    const result = await service.generateVoice({
      text: 'Hello, testing voice generation service.',
      language: 'en',
    });

    expect(result).toBeDefined();
    expect(result.providerUsed).toBe('edge-neural');
    expect(result.fallbackTriggered).toBe(false);
    expect(result.output.durationSeconds).toBe(4.5);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'voice.generation.started',
      expect.objectContaining({ text: 'Hello, testing voice generation service.' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'voice.generation.completed',
      expect.objectContaining({ providerUsed: 'edge-neural' }),
    );
  });

  it('should automatically fall back to secondary provider if primary throws error', async () => {
    edgeNeuralProvider.generateVoice.mockRejectedValueOnce(new Error('Edge Neural endpoint timeout'));

    const result = await service.generateVoice({
      text: 'Testing fallback mechanism.',
      language: 'en',
    });

    expect(result).toBeDefined();
    expect(result.providerUsed).toBe('piper-onnx');
    expect(result.fallbackTriggered).toBe(true);
    expect(result.output.durationSeconds).toBe(4.5);
  });

  it('should invalidate downstream cache cleanly', () => {
    service.invalidateDownstream('test-content-123');
    expect(eventEmitter.emit).toHaveBeenCalledWith('voice.cache.invalidated', {
      contentId: 'test-content-123',
    });
  });
});
