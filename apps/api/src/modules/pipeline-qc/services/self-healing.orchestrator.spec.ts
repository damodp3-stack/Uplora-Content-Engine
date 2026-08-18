import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SelfHealingOrchestratorService } from './self-healing.orchestrator';
import { PipelineQcService } from './pipeline-qc.service';
import { VoiceGenerationService } from '../../voice-generation/services/voice-generation.service';
import { AudioMasteringService } from '../../audio-studio/services/audio-mastering.service';
import { PipelineQcResult } from '../interfaces/pipeline-qc.interface';

jest.setTimeout(30000);

describe('SelfHealingOrchestratorService', () => {
  let service: SelfHealingOrchestratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SelfHealingOrchestratorService,
        {
          provide: PipelineQcService,
          useValue: {
            evaluatePipeline: jest.fn().mockResolvedValue({
              passed: true,
              overallScore: 92,
              criticalGatesPassed: true,
              isProductionReady: true,
              criticalReport: { failedCriticalGates: [], avSyncDeltaMs: 10 },
            }),
          },
        },
        {
          provide: VoiceGenerationService,
          useValue: {
            generateVoice: jest.fn().mockResolvedValue({
              output: { audioBuffer: Buffer.from('voice_data'), durationSeconds: 8.5 },
            }),
          },
        },
        {
          provide: AudioMasteringService,
          useValue: {
            masterAudioTrack: jest.fn().mockResolvedValue({
              output: { masteredBuffer: Buffer.from('mastered_data'), durationSeconds: 8.5 },
            }),
          },
        },
        {
          provide: EventEmitter2,
          useValue: { emit: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<SelfHealingOrchestratorService>(SelfHealingOrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should identify earliest failed stage accurately', () => {
    const clippingFailResult: PipelineQcResult = {
      passed: false,
      overallScore: 70,
      criticalGatesPassed: false,
      isProductionReady: false,
      scoreBreakdown: {} as any,
      criticalReport: { failedCriticalGates: ['AUDIO_CLIPPING'], avSyncDeltaMs: 0 } as any,
      warnings: [],
    };

    const earliestStage = service.determineEarliestFailedStage(clippingFailResult);
    expect(earliestStage).toBe('AUDIO_MASTERING');
  });
});
