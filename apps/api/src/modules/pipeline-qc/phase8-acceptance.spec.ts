import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { PipelineQcService } from './services/pipeline-qc.service';
import { SelfHealingOrchestratorService } from './services/self-healing.orchestrator';
import { StorageHygieneService } from './services/storage-hygiene.service';
import { VoiceGenerationService } from '../voice-generation/services/voice-generation.service';
import { AudioMasteringService } from '../audio-studio/services/audio-mastering.service';
import { MediaService } from '../media/media.service';
import { PipelineQcResult } from './interfaces/pipeline-qc.interface';

jest.setTimeout(30000);

describe('Phase 8 Acceptance Suite — Hardened Pipeline QC, Self-Healing & Storage Hygiene', () => {
  let module: TestingModule;
  let qcService: PipelineQcService;
  let selfHealing: SelfHealingOrchestratorService;
  let storageHygiene: StorageHygieneService;

  const mockVoiceService = {
    generateVoice: jest.fn().mockResolvedValue({
      output: { audioBuffer: Buffer.from('voice_data'), durationSeconds: 15.0 },
    }),
  };

  const mockAudioMastering = {
    masterAudioTrack: jest.fn().mockResolvedValue({
      output: { masteredBuffer: Buffer.from('mastered_data'), durationSeconds: 15.0 },
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
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('1. PipelineQcService enforces Dual-Gate Rule and Critical Gate Failures', async () => {
    const failureResult = await qcService.evaluatePipeline('invalid_media_path.mp4', 30.0);

    expect(failureResult.passed).toBe(false);
    expect(failureResult.criticalGatesPassed).toBe(false);
    expect(failureResult.isProductionReady).toBe(false);
    expect(failureResult.criticalReport.failedCriticalGates).toContain('FILE_NOT_FOUND');
  });

  it('2. Deterministic Self-Healing Failure Test: verifies failure detection, targeted recovery, and 3-attempt limit', async () => {
    const initialFailQc: PipelineQcResult = {
      passed: false,
      overallScore: 60,
      criticalGatesPassed: false,
      isProductionReady: false,
      scoreBreakdown: { scriptTimingScore: 5 } as any,
      criticalReport: { failedCriticalGates: ['AUDIO_CLIPPING'], avSyncDeltaMs: 120 } as any,
      warnings: ['Audio clipping detected'],
    };

    const response = await selfHealing.orchestrateSelfHealing(
      {
        jobId: 'test_job_fail_recovery',
        workspaceId: 'ws_test',
        projectId: 'proj_test',
        prompt: 'Test prompt',
        language: 'en-US',
        targetDurationSeconds: 15.0,
        currentAttempt: 1,
        maxAttempts: 3,
        stageHistory: [],
      },
      'non_existent_video.mp4',
      'Test script text',
      initialFailQc,
    );

    expect(response).toBeDefined();
    // After 3 attempts on invalid file, produces structured DiagnosticReport
    expect(response.diagnosticReport).toBeDefined();
    expect(response.diagnosticReport?.jobId).toBe('test_job_fail_recovery');
    expect(response.diagnosticReport?.recoveryAttempts).toBe(3);
    expect(response.diagnosticReport?.finalStatus).toBe('FAILED');
    expect(response.diagnosticReport?.failedCriterion).toBe('AUDIO_CLIPPING');
    expect(response.diagnosticReport?.stage).toBe('AUDIO_MASTERING');
  });

  it('3. StorageHygieneService supports dryRun capability without deleting protected assets', () => {
    const result = storageHygiene.cleanupTransientScratchFiles({
      dryRun: true,
      jobId: 'non_existent_job_123',
    });

    expect(result).toBeDefined();
    expect(result.dryRun).toBe(true);
    expect(typeof result.filesExamined).toBe('number');
  });
});
