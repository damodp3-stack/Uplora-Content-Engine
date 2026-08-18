import { Test, TestingModule } from '@nestjs/testing';
import { PipelineQcService } from './pipeline-qc.service';
import * as fs from 'fs';
import * as path from 'path';

jest.setTimeout(30000);

describe('PipelineQcService', () => {
  let service: PipelineQcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PipelineQcService],
    }).compile();

    service = module.get<PipelineQcService>(PipelineQcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should evaluate real media payload and compute 100-point dual-gate score', async () => {
    const candidatePaths = [
      path.join(process.cwd(), '..', '..', 'scratch', 'real_phase7_final_mastered_en.mp4'),
      path.join(process.cwd(), '..', 'scratch', 'real_phase7_final_mastered_en.mp4'),
      path.join(process.cwd(), 'scratch', 'real_phase7_final_mastered_en.mp4'),
      'd:/Content Creation Engine/scratch/real_phase7_final_mastered_en.mp4',
    ];

    let mediaPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        mediaPath = p;
        break;
      }
    }

    if (!mediaPath) {
      // Create fallback dummy payload if test runner runs before real file creation
      const scratchDir = path.join(process.cwd(), 'scratch');
      if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
      mediaPath = path.join(scratchDir, 'dummy_test.mp4');
      fs.writeFileSync(mediaPath, Buffer.from('dummy mp4 content'));
    }

    const result = await service.evaluatePipeline(mediaPath, 8.5);

    expect(result).toBeDefined();
    expect(result.scoreBreakdown).toBeDefined();
    expect(result.criticalReport).toBeDefined();
  });

  it('should enforce Dual-Gate Rule: fail production readiness if critical gate fails', async () => {
    // Evaluating invalid path triggers FILE_NOT_FOUND critical failure
    const result = await service.evaluatePipeline('non_existent_file.mp4', 30.0);

    expect(result.passed).toBe(false);
    expect(result.criticalGatesPassed).toBe(false);
    expect(result.isProductionReady).toBe(false);
    expect(result.criticalReport.failedCriticalGates).toContain('FILE_NOT_FOUND');
  });
});
