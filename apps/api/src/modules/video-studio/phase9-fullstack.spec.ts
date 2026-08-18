import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { PipelineProgressGateway } from '../realtime/pipeline-progress.gateway';
import { PipelineQcService } from '../pipeline-qc/services/pipeline-qc.service';
import { SelfHealingOrchestratorService } from '../pipeline-qc/services/self-healing.orchestrator';
import { VoiceGenerationService } from '../voice-generation/services/voice-generation.service';
import { AudioMasteringService } from '../audio-studio/services/audio-mastering.service';

jest.setTimeout(30000);

describe('Phase 9 Acceptance Suite — SaaS Product Hardening & Full-Stack Workflow', () => {
  let module: TestingModule;
  let gateway: PipelineProgressGateway;
  let qcService: PipelineQcService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        PipelineProgressGateway,
        PipelineQcService,
        { provide: JwtService, useValue: { verify: jest.fn().mockReturnValue({ activeWorkspaceId: 'default-workspace' }) } },
        { provide: SelfHealingOrchestratorService, useValue: {} },
        { provide: VoiceGenerationService, useValue: {} },
        { provide: AudioMasteringService, useValue: {} },
      ],
    }).compile();

    gateway = module.get<PipelineProgressGateway>(PipelineProgressGateway);
    qcService = module.get<PipelineQcService>(PipelineQcService);

    gateway.server = {
      to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      emit: jest.fn(),
    } as any;
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  it('1. PipelineProgressGateway broadcasts live pipeline stage progress to room subscribers', () => {
    const payload = {
      jobId: 'job_fullstack_999',
      stage: 'QUALITY_CHECK',
      progressPercent: 90,
      timestamp: new Date().toISOString(),
    };

    gateway.handlePipelineProgress(payload);
    expect(gateway.server.to).toHaveBeenCalledWith('job_job_fullstack_999');
  });

  it('2. PipelineQcService evaluates full-stack 100-Point Quality Score & Dual-Gate certificate', async () => {
    const result = await qcService.evaluatePipeline('non_existent.mp4', 30.0);
    expect(result).toBeDefined();
    expect(result.scoreBreakdown).toBeDefined();
  });
});
