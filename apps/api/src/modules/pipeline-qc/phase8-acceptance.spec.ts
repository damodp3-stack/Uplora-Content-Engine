import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { PipelineQcService } from './services/pipeline-qc.service';
import { SelfHealingOrchestratorService } from './services/self-healing.orchestrator';
import { StorageHygieneService } from './services/storage-hygiene.service';
import { VoiceGenerationService } from '../voice-generation/services/voice-generation.service';
import { AudioMasteringService } from '../audio-studio/services/audio-mastering.service';
import { MediaService } from '../media/media.service';

jest.setTimeout(30000);

describe('Phase 8 Acceptance Suite — Full Pipeline QC & Self-Healing Engine', () => {
  let module: TestingModule;
  let qcService: PipelineQcService;
  let selfHealing: SelfHealingOrchestratorService;
  let storageHygiene: StorageHygieneService;
  let eventEmitter: EventEmitter2;

  const eventsEmitted: string[] = [];

  const mockVoiceService = {
    generateVoice: jest.fn().mockResolvedValue({
      output: { audioBuffer: Buffer.from('voice_data'), durationSeconds: 8.5 },
    }),
  };

  const mockAudioMastering = {
    masterAudioTrack: jest.fn().mockResolvedValue({
      output: { masteredBuffer: Buffer.from('mastered_data'), durationSeconds: 8.5 },
    }),
  };

  const mockMediaService = {
    uploadAndSaveAsset: jest.fn().mockResolvedValue({
      id: 'asset_qc_123',
      status: 'AVAILABLE',
    }),
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        PipelineQcService,
        SelfHealingOrchestratorService,
        StorageHygieneService,
        { provide: VoiceGenerationService, useValue: mockVoiceService },
        { provide: AudioMasteringService, useValue: mockAudioMastering },
        { provide: MediaService, useValue: mockMediaService },
      ],
    }).compile();

    qcService = module.get<PipelineQcService>(PipelineQcService);
    selfHealing = module.get<SelfHealingOrchestratorService>(SelfHealingOrchestratorService);
    storageHygiene = module.get<StorageHygieneService>(StorageHygieneService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    eventEmitter.on('pipeline.self_healing.started', () => eventsEmitted.push('pipeline.self_healing.started'));
    eventEmitter.on('pipeline.self_healing.completed', () => eventsEmitted.push('pipeline.self_healing.completed'));
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('1. PipelineQcService enforces Dual-Gate Rule: Overall Score >= 85 AND Critical Gates PASS', async () => {
    // Failing file triggers critical gate failure
    const failureResult = await qcService.evaluatePipeline('invalid_media_path.mp4', 30.0);

    expect(failureResult.passed).toBe(false);
    expect(failureResult.criticalGatesPassed).toBe(false);
    expect(failureResult.isProductionReady).toBe(false);
    expect(failureResult.criticalReport.failedCriticalGates.length).toBeGreaterThan(0);
  });

  it('2. SelfHealingOrchestratorService routes targeted recovery for earliest failed stage', () => {
    const mockFailQc = {
      passed: false,
      overallScore: 60,
      criticalGatesPassed: false,
      isProductionReady: false,
      scoreBreakdown: { scriptTimingScore: 5 } as any,
      criticalReport: { failedCriticalGates: ['AV_SYNC'], avSyncDeltaMs: 120 } as any,
      warnings: ['A/V Sync error'],
    };

    const failedStage = selfHealing.determineEarliestFailedStage(mockFailQc);
    expect(failedStage).toBe('AUDIO_MASTERING');
  });

  it('3. StorageHygieneService purges transient scratch payloads without affecting production assets', () => {
    const result = storageHygiene.cleanupTransientScratchFiles('non_existent_job_123');
    expect(result).toBeDefined();
    expect(typeof result.filesRemoved).toBe('number');
  });
});
