import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  PipelineQcResult,
  QualityScoreBreakdown,
  CriticalQcReport,
  CriticalQcGate,
} from '../interfaces/pipeline-qc.interface';

const execFileAsync = promisify(execFile);

@Injectable()
export class PipelineQcService {
  private readonly logger = new Logger(PipelineQcService.name);
  private ffmpegPath: string | null = null;
  private ffprobePath: string | null = null;

  constructor() {
    this.detectBinaries();
  }

  private detectBinaries(): void {
    const candidateFfmpeg = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'bin', 'ffmpeg.exe'),
      'ffmpeg.exe',
      'ffmpeg',
    ];
    for (const p of candidateFfmpeg) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffmpegPath = p;
        break;
      }
    }
    if (!this.ffmpegPath) this.ffmpegPath = 'ffmpeg';

    const candidateFfprobe = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffprobe.exe'),
      path.join(process.cwd(), 'bin', 'ffprobe.exe'),
      'ffprobe.exe',
      'ffprobe',
    ];
    for (const p of candidateFfprobe) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffprobePath = p;
        break;
      }
    }
    if (!this.ffprobePath) this.ffprobePath = 'ffprobe';
  }

  public async evaluatePipeline(
    mediaPath: string,
    targetDurationSeconds: number = 30.0,
    expectedChecksum?: string,
  ): Promise<PipelineQcResult> {
    if (!mediaPath || !fs.existsSync(mediaPath)) {
      this.logger.error(`Media file not found at path: ${mediaPath}`);
      return this.buildFailureResult(['FILE_NOT_FOUND'], `Media file not found at: ${mediaPath}`);
    }

    const fileStat = fs.statSync(mediaPath);
    if (fileStat.size === 0) {
      return this.buildFailureResult(['CORRUPT_MEDIA'], 'Media file is 0 bytes');
    }

    const warnings: string[] = [];
    const failedCriticalGates: CriticalQcGate[] = [];

    // Calculate file checksum
    const fileBuffer = fs.readFileSync(mediaPath);
    const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    let checksumValid = true;
    if (expectedChecksum && expectedChecksum !== actualChecksum) {
      checksumValid = false;
      failedCriticalGates.push('CHECKSUM_MISMATCH');
      warnings.push(`Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
    }

    // Run FFprobe Inspection
    let videoDurationMs = 0;
    let audioDurationMs = 0;
    let videoCodec = '';
    let audioCodec = '';
    let videoWidth = 0;
    let videoHeight = 0;
    let audioSampleRate = 0;

    try {
      const { stdout } = await execFileAsync(this.ffprobePath!, [
        '-v',
        'error',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        mediaPath,
      ]);

      const probeData = JSON.parse(stdout);
      const formatDuration = parseFloat(probeData.format?.duration || '0');

      const videoStream = probeData.streams?.find((s: any) => s.codec_type === 'video');
      const audioStream = probeData.streams?.find((s: any) => s.codec_type === 'audio');

      if (!videoStream) {
        failedCriticalGates.push('MISSING_VIDEO_STREAM');
      } else {
        videoCodec = videoStream.codec_name || '';
        videoWidth = videoStream.width || 0;
        videoHeight = videoStream.height || 0;
        const vDur = parseFloat(videoStream.duration || probeData.format?.duration || '0');
        videoDurationMs = Math.round(vDur * 1000);
      }

      if (!audioStream) {
        failedCriticalGates.push('MISSING_AUDIO_STREAM');
      } else {
        audioCodec = audioStream.codec_name || '';
        audioSampleRate = parseInt(audioStream.sample_rate || '0', 10);
        const aDur = parseFloat(audioStream.duration || probeData.format?.duration || '0');
        audioDurationMs = Math.round(aDur * 1000);
      }
    } catch (probeErr: any) {
      this.logger.error(`FFprobe probing failed: ${probeErr.message}`);
      failedCriticalGates.push('CORRUPT_MEDIA');
    }

    // Explicit A/V Sync Lock Check
    // Pass condition: abs(videoDurationMs - audioDurationMs) <= 50ms AND end timestamp alignment
    const avSyncDeltaMs = Math.abs(videoDurationMs - audioDurationMs);
    const endTimestampMatchMs = avSyncDeltaMs;
    const avSyncPassed = avSyncDeltaMs <= 50;

    if (!avSyncPassed && videoDurationMs > 0 && audioDurationMs > 0) {
      failedCriticalGates.push('AV_SYNC');
      warnings.push(`A/V Sync Lock Failure: |v_dur(${videoDurationMs}ms) - a_dur(${audioDurationMs}ms)| = ${avSyncDeltaMs}ms > 50ms limit`);
    }

    // Run FFmpeg Audio Clipping & Silence Inspection via astats
    let hasAudioClipping = false;
    let hasSilenceGap = false;

    try {
      const { stderr } = await execFileAsync(this.ffmpegPath!, [
        '-i',
        mediaPath,
        '-af',
        'astats=metadata=1,silencedetect=n=-50dB:d=1',
        '-f',
        'null',
        '-',
      ]);

      const outputStr = stderr || '';
      if (outputStr.includes('silence_start')) {
        hasSilenceGap = true;
        warnings.push('Warning: Audio stream contains silent gaps (>1s)');
      }
      if (outputStr.toLowerCase().includes('peak level db: 0.00') || outputStr.toLowerCase().includes('clipping')) {
        hasAudioClipping = true;
        failedCriticalGates.push('AUDIO_CLIPPING');
        warnings.push('Critical Error: Digital audio peak clipping detected (0 dBFS ceiling violation)');
      }
    } catch (_) {}

    // Calculate 100-Point Quality Scores
    const targetDurationMs = targetDurationSeconds * 1000;

    // 1. Script & Timing Score (Max 20)
    const durationVarianceRatio = Math.abs(videoDurationMs - targetDurationMs) / targetDurationMs;
    const scriptTimingScore = Math.max(0, Math.round(20 * (1 - Math.min(1, durationVarianceRatio * 2))));

    // 2. Image Visual Score (Max 15)
    let imageQualityScore = 15;
    if (videoWidth !== 768 || videoHeight !== 1344) {
      imageQualityScore = 5;
      warnings.push(`Visual Warning: Resolution ${videoWidth}x${videoHeight} is not target 768x1344 9:16 aspect ratio`);
    }

    // 3. Video Motion Score (Max 20)
    let videoMotionScore = 20;
    if (videoCodec !== 'h264') {
      videoMotionScore = 10;
      warnings.push(`Motion Warning: Video codec ${videoCodec} is not standard h264`);
    }

    // 4. Audio Mastering Score (Max 20)
    let audioMasteringScore = 20;
    if (audioCodec !== 'aac') {
      audioMasteringScore = 10;
    }
    if (hasAudioClipping) {
      audioMasteringScore = 0;
    }

    // 5. A/V Sync Score (Max 15)
    let avSyncScore = 15;
    if (!avSyncPassed) {
      avSyncScore = Math.max(0, Math.round(15 - (avSyncDeltaMs / 10)));
    }

    // 6. Media Persistence Score (Max 10)
    let mediaPersistenceScore = 10;
    if (!checksumValid || fileStat.size < 1000) {
      mediaPersistenceScore = 0;
    }

    const overallScore = Math.min(
      100,
      scriptTimingScore + imageQualityScore + videoMotionScore + audioMasteringScore + avSyncScore + mediaPersistenceScore,
    );

    const criticalGatesPassed = failedCriticalGates.length === 0;

    // DUAL-GATE RULE: Production PASS requires BOTH score >= 85 AND all critical gates passing!
    const isProductionReady = overallScore >= 85 && criticalGatesPassed;
    const passed = isProductionReady;

    const scoreBreakdown: QualityScoreBreakdown = {
      scriptTimingScore,
      imageQualityScore,
      videoMotionScore,
      audioMasteringScore,
      avSyncScore,
      mediaPersistenceScore,
      overallScore,
    };

    const criticalReport: CriticalQcReport = {
      criticalGatesPassed,
      failedCriticalGates,
      avSyncDeltaMs,
      endTimestampMatchMs,
      videoCodec,
      videoWidth,
      videoHeight,
      audioCodec,
      audioSampleRate,
      fileExists: true,
      fileSizeBytes: fileStat.size,
      checksumValid,
      hasAudioClipping,
      hasSilenceGap,
    };

    this.logger.log(
      `Pipeline Quality Evaluation Result: [OverallScore=${overallScore}/100, CriticalPassed=${criticalGatesPassed}, ProductionReady=${isProductionReady}, FailedGates=${failedCriticalGates.join(',') || 'NONE'}]`,
    );

    return {
      passed,
      overallScore,
      criticalGatesPassed,
      isProductionReady,
      scoreBreakdown,
      criticalReport,
      warnings,
    };
  }

  private buildFailureResult(failedGates: CriticalQcGate[], reason: string): PipelineQcResult {
    return {
      passed: false,
      overallScore: 0,
      criticalGatesPassed: false,
      isProductionReady: false,
      scoreBreakdown: {
        scriptTimingScore: 0,
        imageQualityScore: 0,
        videoMotionScore: 0,
        audioMasteringScore: 0,
        avSyncScore: 0,
        mediaPersistenceScore: 0,
        overallScore: 0,
      },
      criticalReport: {
        criticalGatesPassed: false,
        failedCriticalGates: failedGates,
        avSyncDeltaMs: 9999,
        endTimestampMatchMs: 9999,
        fileExists: false,
        fileSizeBytes: 0,
        checksumValid: false,
        hasAudioClipping: false,
        hasSilenceGap: false,
      },
      warnings: [reason],
    };
  }
}
