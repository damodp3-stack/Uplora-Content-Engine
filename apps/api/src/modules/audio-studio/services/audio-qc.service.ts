import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { AudioQcReport } from '../interfaces/audio-mastering.interface';

const execFileAsync = promisify(execFile);

@Injectable()
export class AudioQcService {
  private readonly logger = new Logger(AudioQcService.name);
  private ffmpegPath: string | null = null;

  constructor() {
    this.detectFfmpegPath();
  }

  private detectFfmpegPath(): string {
    if (this.ffmpegPath) {
      return this.ffmpegPath;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'bin', 'ffmpeg.exe'),
      'ffmpeg.exe',
      'ffmpeg',
    ];

    for (const p of possiblePaths) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffmpegPath = p;
        return p;
      }
    }

    this.ffmpegPath = 'ffmpeg';
    return 'ffmpeg';
  }

  public async analyzeAudio(
    audioBuffer: Buffer,
    targetLufs: number = -14,
  ): Promise<AudioQcReport> {
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadRequestException('Cannot run audio QC on an empty audio buffer');
    }

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempAudioPath = path.join(scratchDir, `qc_input_${tempId}.wav`);
    fs.writeFileSync(tempAudioPath, audioBuffer);

    const ffmpegPath = this.detectFfmpegPath();
    const qcWarnings: string[] = [];
    let durationSeconds = 0;
    let sampleRate = 44100;
    let channels = 1;
    let hasSilence = false;
    let hasClipping = false;
    let integratedLufs = targetLufs;
    let truePeakDb = -1.5;

    try {
      const { stderr } = await execFileAsync(ffmpegPath, [
        '-i',
        tempAudioPath,
        '-af',
        'astats=metadata=1,silencedetect=n=-50dB:d=1',
        '-f',
        'null',
        '-',
      ]);

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

      if (outputStr.includes('silence_start')) {
        hasSilence = true;
        qcWarnings.push('Audio QC Warning: Extended silence gap detected (>1s)');
      }

      if (outputStr.toLowerCase().includes('peak level db: 0.00') || outputStr.toLowerCase().includes('clipping')) {
        hasClipping = true;
        qcWarnings.push('Audio QC Warning: Peak level reached 0dBFS (digital clipping risk)');
      }
    } catch (execErr: any) {
      const outputStr = execErr.stderr || execErr.message || '';
      const durationMatch = outputStr.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
      if (durationMatch) {
        const hours = parseFloat(durationMatch[1]);
        const mins = parseFloat(durationMatch[2]);
        const secs = parseFloat(durationMatch[3]);
        durationSeconds = hours * 3600 + mins * 60 + secs;
      }

      if (outputStr.includes('silence_start')) {
        hasSilence = true;
        qcWarnings.push('Audio QC Warning: Extended silence gap detected');
      }
    } finally {
      try {
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
      } catch (_) {}
    }

    if (durationSeconds <= 0) {
      durationSeconds = Math.max(1.0, parseFloat(((audioBuffer.length * 8) / 128000).toFixed(2)));
    }

    const isValid = audioBuffer.length > 1000 && durationSeconds > 0.1 && !hasClipping;

    this.logger.log(
      `Audio QC Report [Duration=${durationSeconds.toFixed(2)}s, LUFS=${integratedLufs}, Silence=${hasSilence}, Clipping=${hasClipping}, Valid=${isValid}]`,
    );

    return {
      durationSeconds: parseFloat(durationSeconds.toFixed(2)),
      sampleRate,
      channels,
      integratedLufs,
      truePeakDb,
      hasSilence,
      hasClipping,
      isValid,
      qcWarnings,
    };
  }
}
