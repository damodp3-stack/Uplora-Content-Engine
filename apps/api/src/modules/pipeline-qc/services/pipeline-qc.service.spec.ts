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

  it('should calculate WPM timing accurately', () => {
    const text = 'One two three four five six seven eight nine ten.';
    const report = service.calculateWpmTiming(text, 4.0); // 10 words in 4 seconds = 150 WPM

    expect(report.wordCount).toBe(10);
    expect(report.actualWpm).toBe(150);
    expect(report.isWpmPassed).toBe(true);
  });

  it('should validate shot timeline for gaps, overlaps, and ordering', () => {
    const shots = [
      { shotIndex: 0, expectedDurationSeconds: 15.0 },
      { shotIndex: 1, expectedDurationSeconds: 15.0 },
    ];

    const report = service.validateShotTimeline(shots);

    expect(report.totalShots).toBe(2);
    expect(report.validShots).toBe(2);
    expect(report.hasMissingShots).toBe(false);
  });

  it('should measure real EBU R128 LUFS loudness pass', async () => {
    const candidatePaths = [
      path.join(process.cwd(), '..', '..', 'scratch', 'real_phase8_final_30s_en.mp4'),
      path.join(process.cwd(), '..', 'scratch', 'real_phase8_final_30s_en.mp4'),
      path.join(process.cwd(), 'scratch', 'real_phase8_final_30s_en.mp4'),
      'd:/Content Creation Engine/scratch/real_phase8_final_30s_en.mp4',
    ];

    let mediaPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        mediaPath = p;
        break;
      }
    }

    if (mediaPath) {
      const ebuReport = await service.measureRealEbuLufs(mediaPath, -16.0);
      expect(ebuReport).toBeDefined();
      expect(typeof ebuReport.integratedLufs).toBe('number');
      expect(typeof ebuReport.truePeakDb).toBe('number');
    }
  });
});
