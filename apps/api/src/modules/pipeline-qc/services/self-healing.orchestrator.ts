import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PipelineQcResult,
  PipelineJobContext,
  SelfHealingStage,
  DiagnosticReport,
} from '../interfaces/pipeline-qc.interface';
import { PipelineQcService } from './pipeline-qc.service';
import { VoiceGenerationService } from '../../voice-generation/services/voice-generation.service';
import { AudioMasteringService } from '../../audio-studio/services/audio-mastering.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class SelfHealingOrchestratorService {
  private readonly logger = new Logger(SelfHealingOrchestratorService.name);
  private ffmpegPath: string | null = null;

  constructor(
    private readonly qcService: PipelineQcService,
    private readonly voiceService: VoiceGenerationService,
    private readonly audioMastering: AudioMasteringService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.detectFfmpegPath();
  }

  private detectFfmpegPath(): string {
    if (this.ffmpegPath) return this.ffmpegPath;
    const possible = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'bin', 'ffmpeg.exe'),
      'ffmpeg.exe',
      'ffmpeg',
    ];
    for (const p of possible) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffmpegPath = p;
        return p;
      }
    }
    this.ffmpegPath = 'ffmpeg';
    return 'ffmpeg';
  }

  public determineEarliestFailedStage(qcResult: PipelineQcResult): SelfHealingStage {
    const failedGates = qcResult.criticalReport.failedCriticalGates || [];

    if (failedGates.includes('AUDIO_CLIPPING')) {
      return 'AUDIO_MASTERING';
    }
    if (failedGates.includes('AV_SYNC')) {
      return 'AUDIO_MASTERING';
    }
    if (failedGates.includes('MISSING_AUDIO_STREAM')) {
      return 'TTS_NARRATION';
    }
    if (failedGates.includes('MISSING_VIDEO_STREAM') || failedGates.includes('CORRUPT_MEDIA')) {
      return 'VIDEO_MOTION';
    }
    if (qcResult.scoreBreakdown.scriptTimingScore < 10) {
      return 'SCRIPT_TIMING';
    }

    return 'AUDIO_MASTERING';
  }

  public async orchestrateSelfHealing(
    jobContext: PipelineJobContext,
    videoPath: string,
    narrationText: string,
    initialQcResult: PipelineQcResult,
  ): Promise<{ finalQcResult: PipelineQcResult; finalVideoPath: string; diagnosticReport?: DiagnosticReport }> {
    this.logger.log(
      `Initiating Autonomous Self-Healing Recovery [Job=${jobContext.jobId}, InitialScore=${initialQcResult.overallScore}, InitialPassed=${initialQcResult.passed}]`,
    );

    let currentQcResult = initialQcResult;
    let currentVideoPath = videoPath;
    let attempt = jobContext.currentAttempt || 1;
    const maxAttempts = jobContext.maxAttempts || 3;
    const stageFailures: SelfHealingStage[] = [...(jobContext.stageHistory || [])];

    while (!currentQcResult.passed && attempt < maxAttempts) {
      attempt++;
      const failedStage = this.determineEarliestFailedStage(currentQcResult);
      stageFailures.push(failedStage);

      this.logger.log(
        `Self-Healing Attempt ${attempt}/${maxAttempts}: Earliest Failed Stage identified as [${failedStage}]`,
      );

      this.eventEmitter.emit('pipeline.self_healing.started', {
        jobId: jobContext.jobId,
        attempt,
        failedStage,
        timestamp: new Date().toISOString(),
      });

      const scratchDir = path.dirname(currentVideoPath);
      const tempId = `${Date.now()}_heal_${attempt}`;

      try {
        if (failedStage === 'AUDIO_MASTERING' || failedStage === 'SCRIPT_TIMING') {
          // Targeted Healing: Adjust speaking rate & re-master audio payload
          const speakingRate = failedStage === 'SCRIPT_TIMING' ? 1.1 : 1.0;

          const voiceResult = await this.voiceService.generateVoice({
            text: narrationText,
            voiceId: jobContext.voiceId || (jobContext.language === 'ta-IN' ? 'ta-IN-PallaviNeural' : 'en-US-JennyNeural'),
            language: jobContext.language,
            speakingRate,
          });

          const masteredResult = await this.audioMastering.masterAudioTrack({
            voiceBuffer: voiceResult.output.audioBuffer,
            musicCategory: 'corporate',
            loudnessProfile: 'REELS',
            duckingThreshold: 0.08,
            workspaceId: jobContext.workspaceId,
            projectId: jobContext.projectId,
          });

          const tempHealedAudioPath = path.join(scratchDir, `healed_audio_${tempId}.wav`);
          fs.writeFileSync(tempHealedAudioPath, masteredResult.output.masteredBuffer);

          const healedVideoPath = path.join(scratchDir, `healed_reel_${tempId}.mp4`);
          await execFileAsync(this.detectFfmpegPath(), [
            '-i',
            currentVideoPath,
            '-i',
            tempHealedAudioPath,
            '-c:v',
            'copy',
            '-c:a',
            'aac',
            '-b:a',
            '128k',
            '-map',
            '0:v:0',
            '-map',
            '1:a:0',
            '-shortest',
            '-y',
            healedVideoPath,
          ]);

          if (fs.existsSync(healedVideoPath)) {
            currentVideoPath = healedVideoPath;
          }
        }

        // Re-evaluate Pipeline Quality
        currentQcResult = await this.qcService.evaluatePipeline(
          currentVideoPath,
          jobContext.targetDurationSeconds,
        );

        this.eventEmitter.emit('pipeline.self_healing.completed', {
          jobId: jobContext.jobId,
          attempt,
          passed: currentQcResult.passed,
          newScore: currentQcResult.overallScore,
        });

        if (currentQcResult.passed) {
          this.logger.log(`✅ Self-Healing Succeeded on Attempt ${attempt}! New Score: ${currentQcResult.overallScore}/100`);
          return { finalQcResult: currentQcResult, finalVideoPath: currentVideoPath };
        }
      } catch (healErr: any) {
        this.logger.error(`Self-healing attempt ${attempt} execution error: ${healErr.message}`);
      }
    }

    // Final Failure Diagnostic Report Generation
    const primaryFailedGate = currentQcResult.criticalReport.failedCriticalGates[0] || 'QUALITY_SCORE_BELOW_THRESHOLD';
    const diagnosticReport: DiagnosticReport = {
      jobId: jobContext.jobId,
      failedCriterion: primaryFailedGate,
      measuredValue: currentQcResult.criticalReport.avSyncDeltaMs,
      expectedValue: 50,
      recoveryAttempts: attempt,
      stageFailures,
      timestamp: new Date().toISOString(),
      finalStatus: 'FAILED',
    };

    this.logger.error(
      `❌ Self-Healing Exhausted after ${attempt} attempts. Diagnostic Report generated for job [${jobContext.jobId}]`,
    );

    this.eventEmitter.emit('pipeline.self_healing.failed', {
      jobId: jobContext.jobId,
      diagnosticReport,
    });

    return { finalQcResult: currentQcResult, finalVideoPath: currentVideoPath, diagnosticReport };
  }
}
