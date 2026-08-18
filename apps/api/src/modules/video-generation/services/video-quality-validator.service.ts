import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  codec: string;
  mimeType: string;
  sizeBytes: number;
  fps: number;
  container: string;
}

export interface VideoQCResult {
  isValid: boolean;
  metadata: VideoMetadata;
  errors: string[];
}

@Injectable()
export class VideoQualityValidatorService {
  private readonly logger = new Logger(VideoQualityValidatorService.name);
  private ffprobeExecutablePath: string | null = null;

  constructor() {
    this.detectFfprobePath();
  }

  private detectFfprobePath(): string {
    if (this.ffprobeExecutablePath) {
      return this.ffprobeExecutablePath;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffprobe.exe'),
      path.join(process.cwd(), 'bin', 'ffprobe.exe'),
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffprobe'),
      path.join(process.cwd(), 'bin', 'ffprobe'),
      'ffprobe.exe',
      'ffprobe',
    ];

    for (const p of possiblePaths) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffprobeExecutablePath = p;
        return p;
      }
    }

    // Default to system command
    this.ffprobeExecutablePath = 'ffprobe';
    return 'ffprobe';
  }

  public getFfprobePath(): string {
    return this.detectFfprobePath();
  }

  public async validateVideo(
    videoSource: Buffer | string,
    expectedDurationSeconds?: number,
    expectedWidth?: number,
    expectedHeight?: number,
  ): Promise<VideoQCResult> {
    let tempFilePath: string | null = null;
    let filePath: string;

    if (Buffer.isBuffer(videoSource)) {
      if (videoSource.length === 0) {
        throw new BadRequestException('Video payload is empty (0 bytes)');
      }
      tempFilePath = path.join(
        process.cwd(),
        'scratch',
        `qc_temp_${Date.now()}_${Math.random().toString(36).substring(7)}.mp4`,
      );
      const scratchDir = path.dirname(tempFilePath);
      if (!fs.existsSync(scratchDir)) {
        fs.mkdirSync(scratchDir, { recursive: true });
      }
      fs.writeFileSync(tempFilePath, videoSource);
      filePath = tempFilePath;
    } else {
      filePath = videoSource;
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException(`Video file does not exist at path: ${filePath}`);
      }
    }

    try {
      const probePath = this.getFfprobePath();
      const { stdout } = await execFileAsync(probePath, [
        '-v',
        'quiet',
        '-print_format',
        'json',
        '-show_format',
        '-show_streams',
        filePath,
      ]);

      const probeData = JSON.parse(stdout);
      const errors: string[] = [];

      if (!probeData.format || !probeData.streams || probeData.streams.length === 0) {
        return {
          isValid: false,
          metadata: {
            durationSeconds: 0,
            width: 0,
            height: 0,
            codec: 'unknown',
            mimeType: 'video/mp4',
            sizeBytes: 0,
            fps: 0,
            container: 'unknown',
          },
          errors: ['Invalid video container structure or unreadable streams'],
        };
      }

      const videoStream = probeData.streams.find((s: any) => s.codec_type === 'video');
      if (!videoStream) {
        errors.push('No video stream found in file');
      }

      const formatName = probeData.format.format_name || '';
      const isMp4 = formatName.includes('mp4') || formatName.includes('mov') || formatName.includes('matroska');
      if (!isMp4) {
        errors.push(`Invalid container format '${formatName}', expected MP4`);
      }

      const codec = videoStream?.codec_name || 'unknown';
      const isH264 = codec === 'h264' || codec === 'avc1' || codec.includes('264');
      if (!isH264) {
        errors.push(`Invalid video codec '${codec}', expected H.264`);
      }

      const width = videoStream?.width || 0;
      const height = videoStream?.height || 0;
      if (width === 0 || height === 0) {
        errors.push('Invalid video dimensions (0x0)');
      }

      // Check aspect ratio (~9:16 target, ratio ~0.5625)
      const aspectRatio = width / (height || 1);
      const isVertical916 = aspectRatio >= 0.5 && aspectRatio <= 0.65;
      if (!isVertical916) {
        errors.push(`Video aspect ratio ${aspectRatio.toFixed(4)} is not 9:16 vertical (${width}x${height})`);
      }

      const durationSeconds = parseFloat(probeData.format.duration || videoStream?.duration || '0');
      if (durationSeconds <= 0) {
        errors.push('Invalid video duration (0s)');
      }

      if (expectedDurationSeconds && Math.abs(durationSeconds - expectedDurationSeconds) > 0.75) {
        errors.push(
          `Duration variance exceeds tolerance: got ${durationSeconds.toFixed(2)}s, expected ~${expectedDurationSeconds}s`,
        );
      }

      if (expectedWidth && width !== expectedWidth) {
        errors.push(`Width mismatch: got ${width}, expected ${expectedWidth}`);
      }

      if (expectedHeight && height !== expectedHeight) {
        errors.push(`Height mismatch: got ${height}, expected ${expectedHeight}`);
      }

      const sizeBytes = parseInt(probeData.format.size || '0', 10) || (fs.existsSync(filePath) ? fs.statSync(filePath).size : 0);

      // Parse FPS
      let fps = 30;
      if (videoStream?.r_frame_rate) {
        const parts = videoStream.r_frame_rate.split('/');
        if (parts.length === 2 && parseFloat(parts[1]) > 0) {
          fps = Math.round(parseFloat(parts[0]) / parseFloat(parts[1]));
        }
      }

      const isValid = errors.length === 0;
      if (isValid) {
        this.logger.log(
          `✅ Video QC Passed: video/mp4 (${codec}), ${sizeBytes} bytes, ${width}x${height}, ${durationSeconds.toFixed(2)}s @ ${fps}fps`,
        );
      } else {
        this.logger.warn(`❌ Video QC Validation failed with errors: ${errors.join('; ')}`);
      }

      return {
        isValid,
        metadata: {
          durationSeconds,
          width,
          height,
          codec,
          mimeType: 'video/mp4',
          sizeBytes,
          fps,
          container: formatName,
        },
        errors,
      };
    } catch (err: any) {
      this.logger.error(`Video QC ffprobe execution error: ${err.message}`);
      return {
        isValid: false,
        metadata: {
          durationSeconds: 0,
          width: 0,
          height: 0,
          codec: 'unknown',
          mimeType: 'video/mp4',
          sizeBytes: 0,
          fps: 0,
          container: 'unknown',
        },
        errors: [`ffprobe execution failed: ${err.message}`],
      };
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (_) {}
      }
    }
  }
}
