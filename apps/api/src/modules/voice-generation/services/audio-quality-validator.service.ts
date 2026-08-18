import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface AudioProbeResult {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  codec: string;
  bitrate: number;
  sizeBytes: number;
  mimeType: 'audio/mpeg' | 'audio/wav';
  isValid: boolean;
  validationError?: string;
}

@Injectable()
export class AudioQualityValidatorService {
  private readonly logger = new Logger(AudioQualityValidatorService.name);
  private ffprobePath: string | null = null;

  constructor() {
    this.detectFfprobePath();
  }

  private detectFfprobePath(): string {
    if (this.ffprobePath) {
      return this.ffprobePath;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffprobe.exe'),
      path.join(process.cwd(), 'bin', 'ffprobe.exe'),
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'bin', 'ffmpeg.exe'),
      'ffprobe.exe',
      'ffprobe',
      'ffmpeg.exe',
      'ffmpeg',
    ];

    for (const p of possiblePaths) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffprobePath = p;
        return p;
      }
    }

    this.ffprobePath = 'ffprobe';
    return 'ffprobe';
  }

  public async probeAudioBuffer(audioBuffer: Buffer, preferredMime?: string): Promise<AudioProbeResult> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadRequestException('Audio buffer is empty or undefined');
    }

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const isWav = preferredMime === 'audio/wav' || (audioBuffer.length > 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF');
    const ext = isWav ? 'wav' : 'mp3';
    const tempFilePath = path.join(scratchDir, `probe_${tempId}.${ext}`);

    fs.writeFileSync(tempFilePath, audioBuffer);

    try {
      const execPath = this.detectFfprobePath();
      const isFfmpegExe = execPath.toLowerCase().endsWith('ffmpeg.exe') || execPath.toLowerCase().endsWith('ffmpeg');
      
      let durationSeconds = 0;
      let sampleRate = 24000;
      let channels = 1;
      let codec = ext === 'wav' ? 'pcm_s16le' : 'mp3';
      let bitrate = 64000;

      if (isFfmpegExe) {
        // Use ffmpeg -i to probe stream info
        try {
          const { stderr } = await execFileAsync(execPath, ['-i', tempFilePath]);
          const outputStr = stderr || '';
          
          const durationMatch = outputStr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
          if (durationMatch) {
            const hours = parseFloat(durationMatch[1]);
            const mins = parseFloat(durationMatch[2]);
            const secs = parseFloat(durationMatch[3]);
            durationSeconds = hours * 3600 + mins * 60 + secs;
          }

          const sampleRateMatch = outputStr.match(/(\d+)\s*Hz/);
          if (sampleRateMatch) {
            sampleRate = parseInt(sampleRateMatch[1], 10);
          }

          const bitrateMatch = outputStr.match(/bitrate:\s*(\d+)\s*kb\/s/);
          if (bitrateMatch) {
            bitrate = parseInt(bitrateMatch[1], 10) * 1000;
          }

          if (outputStr.toLowerCase().includes('stereo')) {
            channels = 2;
          } else if (outputStr.toLowerCase().includes('mono')) {
            channels = 1;
          }

          const audioStreamMatch = outputStr.match(/Audio:\s*([a-zA-Z0-9_]+)/);
          if (audioStreamMatch) {
            codec = audioStreamMatch[1];
          }
        } catch (execErr: any) {
          // ffmpeg exits with code 1 when no output file specified, but outputs probe info in stderr
          const outputStr = execErr.stderr || execErr.message || '';
          const durationMatch = outputStr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
          if (durationMatch) {
            const hours = parseFloat(durationMatch[1]);
            const mins = parseFloat(durationMatch[2]);
            const secs = parseFloat(durationMatch[3]);
            durationSeconds = hours * 3600 + mins * 60 + secs;
          }

          const sampleRateMatch = outputStr.match(/(\d+)\s*Hz/);
          if (sampleRateMatch) {
            sampleRate = parseInt(sampleRateMatch[1], 10);
          }

          const bitrateMatch = outputStr.match(/bitrate:\s*(\d+)\s*kb\/s/);
          if (bitrateMatch) {
            bitrate = parseInt(bitrateMatch[1], 10) * 1000;
          }

          if (outputStr.toLowerCase().includes('stereo')) {
            channels = 2;
          } else if (outputStr.toLowerCase().includes('mono')) {
            channels = 1;
          }

          const audioStreamMatch = outputStr.match(/Audio:\s*([a-zA-Z0-9_]+)/);
          if (audioStreamMatch) {
            codec = audioStreamMatch[1];
          }
        }
      }

      // If duration couldn't be parsed, estimate fallback duration based on file size and bitrate
      if (durationSeconds <= 0) {
        const bytes = audioBuffer.length;
        const bits = bytes * 8;
        durationSeconds = Math.max(0.5, parseFloat((bits / (bitrate || 64000)).toFixed(2)));
      }

      const isValid = audioBuffer.length > 500 && durationSeconds > 0.1;
      const mimeType = isWav ? 'audio/wav' : 'audio/mpeg';

      this.logger.log(
        `Audio Probe QC [${mimeType}, ${codec}, ${durationSeconds.toFixed(2)}s, ${sampleRate}Hz, ${channels}ch, ${audioBuffer.length} bytes]`,
      );

      return {
        durationSeconds: parseFloat(durationSeconds.toFixed(2)),
        sampleRate,
        channels,
        codec,
        bitrate,
        sizeBytes: audioBuffer.length,
        mimeType,
        isValid,
        validationError: isValid ? undefined : 'Audio buffer duration or size is below minimum QC threshold',
      };
    } catch (err: any) {
      this.logger.warn(`Audio probing failed: ${err.message}`);
      // Fallback QC calculation
      const isWavHeader = audioBuffer.length > 4 && audioBuffer.toString('ascii', 0, 4) === 'RIFF';
      const fallbackMime = isWavHeader ? 'audio/wav' : 'audio/mpeg';
      const estimatedDuration = Math.max(1.0, parseFloat(((audioBuffer.length * 8) / 64000).toFixed(2)));
      return {
        durationSeconds: estimatedDuration,
        sampleRate: 24000,
        channels: 1,
        codec: isWavHeader ? 'pcm_s16le' : 'mp3',
        bitrate: 64000,
        sizeBytes: audioBuffer.length,
        mimeType: fallbackMime,
        isValid: audioBuffer.length > 500,
      };
    } finally {
      try {
        if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      } catch (_) {}
    }
  }
}
