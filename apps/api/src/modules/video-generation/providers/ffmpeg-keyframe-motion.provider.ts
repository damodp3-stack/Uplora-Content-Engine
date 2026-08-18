import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IKeyframeMotionProvider,
  KeyframeMotionRequest,
  KeyframeMotionOutput,
  MotionPreset,
} from '../interfaces/keyframe-motion-provider.interface';

const execFileAsync = promisify(execFile);

@Injectable()
export class FfmpegKeyframeMotionProvider implements IKeyframeMotionProvider {
  public readonly providerName = 'keyframe-motion';
  private readonly logger = new Logger(FfmpegKeyframeMotionProvider.name);
  private ffmpegExecutablePath: string | null = null;

  constructor() {
    this.detectFfmpegPath();
  }

  private detectFfmpegPath(): string {
    if (this.ffmpegExecutablePath) {
      return this.ffmpegExecutablePath;
    }

    const possiblePaths = [
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'bin', 'ffmpeg.exe'),
      path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg'),
      path.join(process.cwd(), 'bin', 'ffmpeg'),
      'ffmpeg.exe',
      'ffmpeg',
    ];

    for (const p of possiblePaths) {
      if (path.isAbsolute(p) && fs.existsSync(p)) {
        this.ffmpegExecutablePath = p;
        return p;
      }
    }

    this.ffmpegExecutablePath = 'ffmpeg';
    return 'ffmpeg';
  }

  public getFfmpegPath(): string {
    return this.detectFfmpegPath();
  }

  public async getStatus(): Promise<'AVAILABLE' | 'UNAVAILABLE'> {
    try {
      const ffmpegPath = this.getFfmpegPath();
      await execFileAsync(ffmpegPath, ['-version']);
      return 'AVAILABLE';
    } catch (err: any) {
      this.logger.warn(`FFmpeg availability check failed: ${err.message}`);
      return 'UNAVAILABLE';
    }
  }

  public buildFfmpegFilter(
    motionPreset: MotionPreset,
    width: number,
    height: number,
    fps: number,
    durationSeconds: number,
  ): string {
    const totalFrames = Math.round(fps * durationSeconds);
    const d = totalFrames;

    switch (motionPreset) {
      case 'slow_zoom_in':
        return `zoompan=z='min(zoom+0.0015,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'slow_zoom_out':
        return `zoompan=z='max(1.15-0.0015*on,1.0)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'pan_left':
        return `zoompan=z='1.15':x='(1.0-on/${d})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'pan_right':
        return `zoompan=z='1.15':x='(on/${d})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'pan_up':
        return `zoompan=z='1.15':x='iw/2-(iw/zoom/2)':y='(1.0-on/${d})*(ih-ih/zoom)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'pan_down':
        return `zoompan=z='1.15':x='iw/2-(iw/zoom/2)':y='(on/${d})*(ih-ih/zoom)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'subtle_parallax':
        return `zoompan=z='min(1.05+0.0008*on,1.12)':x='(on/${d})*(iw-iw/zoom)':y='ih/2-(ih/zoom/2)':d=${d}:s=${width}x${height},format=yuv420p`;
      case 'static_hold':
      default:
        return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p`;
    }
  }

  public async generateVideoClip(request: KeyframeMotionRequest): Promise<KeyframeMotionOutput> {
    const startTime = Date.now();
    const {
      imageBuffer,
      durationSeconds = 3,
      width = 576,
      height = 1024,
      motionPreset = 'slow_zoom_in',
      fps = 30,
    } = request;

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new InternalServerErrorException('Cannot synthesize video from empty image buffer');
    }

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const inputImagePath = path.join(scratchDir, `input_${tempId}.jpg`);
    const outputVideoPath = path.join(scratchDir, `output_${tempId}.mp4`);

    fs.writeFileSync(inputImagePath, imageBuffer);

    const videoFilter = this.buildFfmpegFilter(motionPreset, width, height, fps, durationSeconds);
    const ffmpegPath = this.getFfmpegPath();

    const ffmpegArgs = [
      '-loop',
      '1',
      '-i',
      inputImagePath,
      '-vf',
      videoFilter,
      '-c:v',
      'libx264',
      '-t',
      durationSeconds.toString(),
      '-pix_fmt',
      'yuv420p',
      '-r',
      fps.toString(),
      '-preset',
      'fast',
      '-y',
      outputVideoPath,
    ];

    this.logger.log(
      `Initiating Keyframe Motion Synthesis [preset=${motionPreset}, ${width}x${height}, ${durationSeconds}s @ ${fps}fps]`,
    );

    try {
      await execFileAsync(ffmpegPath, ffmpegArgs);

      if (!fs.existsSync(outputVideoPath)) {
        throw new InternalServerErrorException(`FFmpeg output video file was not created: ${outputVideoPath}`);
      }

      const videoBuffer = fs.readFileSync(outputVideoPath);
      const sizeBytes = videoBuffer.length;
      if (sizeBytes === 0) {
        throw new InternalServerErrorException('FFmpeg generated a 0-byte video payload');
      }

      const sha256 = crypto.createHash('sha256').update(videoBuffer).digest('hex');
      const latencyMs = Date.now() - startTime;
      const totalFrames = Math.round(fps * durationSeconds);

      this.logger.log(
        `✅ Motion video synthesized successfully (${motionPreset}, ${sizeBytes} bytes, ${latencyMs}ms, SHA: ${sha256.substring(
          0,
          8,
        )}...)`,
      );

      return {
        videoBuffer,
        durationSeconds,
        width,
        height,
        mimeType: 'video/mp4',
        codec: 'h264',
        sha256,
        sizeBytes,
        generationMetadata: {
          provider: this.providerName,
          motionPreset,
          fps,
          frameCount: totalFrames,
          latencyMs,
          ffmpegCommand: `${ffmpegPath} ${ffmpegArgs.join(' ')}`,
        },
      };
    } catch (err: any) {
      this.logger.error(`FFmpeg video synthesis execution error: ${err.message}`);
      throw new InternalServerErrorException(`Keyframe motion video synthesis failed: ${err.message}`);
    } finally {
      // Clean up temporary local files
      try {
        if (fs.existsSync(inputImagePath)) fs.unlinkSync(inputImagePath);
        if (fs.existsSync(outputVideoPath)) fs.unlinkSync(outputVideoPath);
      } catch (_) {}
    }
  }

  public async muxAudioVideo(request: import('../interfaces/keyframe-motion-provider.interface').AudioVideoMuxRequest): Promise<import('../interfaces/keyframe-motion-provider.interface').AudioVideoMuxOutput> {
    const startTime = Date.now();
    const { videoBuffer, audioBuffer, durationSeconds = 5, width = 768, height = 1344 } = request;

    if (!videoBuffer || videoBuffer.length === 0) {
      throw new InternalServerErrorException('Cannot mux audio with empty video buffer');
    }
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new InternalServerErrorException('Cannot mux video with empty audio buffer');
    }

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempVideoPath = path.join(scratchDir, `mux_input_v_${tempId}.mp4`);
    const tempAudioPath = path.join(scratchDir, `mux_input_a_${tempId}.mp3`);
    const outputMuxedPath = path.join(scratchDir, `mux_output_${tempId}.mp4`);

    fs.writeFileSync(tempVideoPath, videoBuffer);
    fs.writeFileSync(tempAudioPath, audioBuffer);

    const ffmpegPath = this.getFfmpegPath();

    // Muxing arguments: loop video stream to match narration audio duration exactly
    const ffmpegArgs = [
      '-stream_loop',
      '-1',
      '-i',
      tempVideoPath,
      '-i',
      tempAudioPath,
      '-c:v',
      'libx264',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-pix_fmt',
      'yuv420p',
      '-shortest',
      '-y',
      outputMuxedPath,
    ];

    this.logger.log(`Initiating FFmpeg Audio/Video Muxing [H.264/AAC, 9:16 target, narration sync]`);

    try {
      await execFileAsync(ffmpegPath, ffmpegArgs);

      if (!fs.existsSync(outputMuxedPath)) {
        throw new InternalServerErrorException(`FFmpeg output muxed video file was not created: ${outputMuxedPath}`);
      }

      const muxedBuffer = fs.readFileSync(outputMuxedPath);
      const sizeBytes = muxedBuffer.length;
      if (sizeBytes === 0) {
        throw new InternalServerErrorException('FFmpeg generated a 0-byte muxed video payload');
      }

      const sha256 = crypto.createHash('sha256').update(muxedBuffer).digest('hex');
      const latencyMs = Date.now() - startTime;

      this.logger.log(
        `✅ Audio/Video Muxing completed successfully (${sizeBytes} bytes, ${latencyMs}ms, SHA: ${sha256.substring(
          0,
          8,
        )}...)`,
      );

      return {
        videoBuffer: muxedBuffer,
        durationSeconds,
        width,
        height,
        mimeType: 'video/mp4',
        videoCodec: 'h264',
        audioCodec: 'aac',
        sha256,
        sizeBytes,
        generationMetadata: {
          provider: this.providerName,
          latencyMs,
          ffmpegCommand: `${ffmpegPath} ${ffmpegArgs.join(' ')}`,
        },
      };
    } catch (err: any) {
      this.logger.error(`FFmpeg audio/video muxing error: ${err.message}`);
      throw new InternalServerErrorException(`FFmpeg audio/video muxing failed: ${err.message}`);
    } finally {
      try {
        if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
        if (fs.existsSync(tempAudioPath)) fs.unlinkSync(tempAudioPath);
        if (fs.existsSync(outputMuxedPath)) fs.unlinkSync(outputMuxedPath);
      } catch (_) {}
    }
  }
}

