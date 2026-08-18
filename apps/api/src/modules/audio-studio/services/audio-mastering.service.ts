import { Injectable, Logger, InternalServerErrorException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  AudioMasteringOptions,
  MasteredAudioOutput,
  LoudnessProfile,
} from '../interfaces/audio-mastering.interface';
import { SoundLibraryService } from './sound-library.service';
import { AudioQcService } from './audio-qc.service';
import { MediaService } from '../../media/media.service';
import { AssetType, MediaAsset } from '../../media/entities/media-asset.entity';

const execFileAsync = promisify(execFile);

@Injectable()
export class AudioMasteringService {
  private readonly logger = new Logger(AudioMasteringService.name);
  private ffmpegPath: string | null = null;

  constructor(
    private readonly soundLibrary: SoundLibraryService,
    private readonly audioQC: AudioQcService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly mediaService?: MediaService,
  ) {
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

  public resolveLoudnessTarget(profile?: LoudnessProfile | string, customLufs?: number): { targetLufs: number; truePeak: number } {
    if (customLufs !== undefined) {
      return { targetLufs: customLufs, truePeak: -1.5 };
    }

    switch (profile?.toUpperCase()) {
      case 'SHORTS':
        return { targetLufs: -14, truePeak: -1.5 };
      case 'PODCAST':
        return { targetLufs: -18, truePeak: -2.0 };
      case 'REELS':
      default:
        return { targetLufs: -16, truePeak: -1.0 };
    }
  }

  public async masterAudioTrack(
    options: AudioMasteringOptions,
  ): Promise<{ output: MasteredAudioOutput; asset?: MediaAsset }> {
    const startTime = Date.now();
    const {
      voiceBuffer,
      musicCategory = 'ambient',
      musicBuffer: customMusicBuffer,
      sfxCues = [],
      loudnessProfile = 'REELS',
      targetLufs: requestedLufs,
      duckingThreshold = 0.08,
      duckingRatio = 6,
      workspaceId,
      projectId,
      shotId,
    } = options;

    if (!voiceBuffer || voiceBuffer.length === 0) {
      throw new InternalServerErrorException('Cannot perform audio mastering on empty voice buffer');
    }

    const { targetLufs, truePeak } = this.resolveLoudnessTarget(loudnessProfile, requestedLufs);

    this.eventEmitter.emit('audio.mastering.started', {
      workspaceId,
      projectId,
      shotId,
      loudnessProfile,
      targetLufs,
      timestamp: new Date().toISOString(),
    });

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempVoicePath = path.join(scratchDir, `master_v_${tempId}.mp3`);
    const tempMusicPath = path.join(scratchDir, `master_m_${tempId}.mp3`);
    const tempMasteredPath = path.join(scratchDir, `master_output_${tempId}.wav`);

    fs.writeFileSync(tempVoicePath, voiceBuffer);

    // 1. Fetch or prepare background music buffer
    const musicBuffer =
      customMusicBuffer || (await this.soundLibrary.getBackgroundMusic(musicCategory, 15));
    fs.writeFileSync(tempMusicPath, musicBuffer);

    // 2. Synthesize & prepare SFX cue inputs
    const sfxTempPaths: string[] = [];
    for (let i = 0; i < sfxCues.length; i++) {
      const cue = sfxCues[i];
      const sfxBuf = await this.soundLibrary.getSoundEffect(cue.sfxId || 'whoosh');
      const sfxP = path.join(scratchDir, `master_sfx_${i}_${tempId}.wav`);
      fs.writeFileSync(sfxP, sfxBuf);
      sfxTempPaths.push(sfxP);
    }

    const ffmpegPath = this.detectFfmpegPath();

    // 3. Construct FFmpeg Filter Graph
    // [0:a] = Voice Narration
    // [1:a] = Background Music
    // [2:a]... = SFX Cues
    const inputArgs = ['-i', tempVoicePath, '-i', tempMusicPath];
    for (const sfxP of sfxTempPaths) {
      inputArgs.push('-i', sfxP);
    }

    const filterParts: string[] = [];

    // Ducking: compress background music based on voice input level
    filterParts.push(`[1:a]volume=0.3[music_base]`);
    filterParts.push(
      `[music_base][0:a]sidechaincompress=threshold=${duckingThreshold}:ratio=${duckingRatio}:attack=20:release=300[music_ducked]`,
    );

    const mixInputs: string[] = ['[0:a]', '[music_ducked]'];

    // Delay and scale SFX cues
    for (let i = 0; i < sfxCues.length; i++) {
      const cue = sfxCues[i];
      const ms = Math.round((cue.timestampSeconds || 0) * 1000);
      const vol = cue.volume ?? 0.4;
      const inputIdx = i + 2;
      filterParts.push(`[${inputIdx}:a]adelay=${ms}|${ms},volume=${vol}[sfx_${i}]`);
      mixInputs.push(`[sfx_${i}]`);
    }

    // Combine tracks & apply LUFS normalization + peak limiter
    filterParts.push(
      `${mixInputs.join('')}amix=inputs=${mixInputs.length}:duration=first:dropout_transition=2,loudnorm=I=${targetLufs}:TP=${truePeak}:LRA=11,alimiter=limit=0.95[mastered]`,
    );

    const ffmpegArgs = [
      ...inputArgs,
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[mastered]',
      '-c:a',
      'pcm_s16le',
      '-y',
      tempMasteredPath,
    ];

    this.logger.log(
      `Initiating FFmpeg Audio Mastering [profile=${loudnessProfile}, target=${targetLufs} LUFS, ducking=${duckingThreshold}, sfx=${sfxCues.length}]`,
    );

    try {
      this.eventEmitter.emit('audio.mastering.progress', {
        step: 'mixing',
        progress: 50,
      });

      await execFileAsync(ffmpegPath, ffmpegArgs);

      if (!fs.existsSync(tempMasteredPath)) {
        throw new InternalServerErrorException(`FFmpeg output mastered audio file was not created: ${tempMasteredPath}`);
      }

      const masteredBuffer = fs.readFileSync(tempMasteredPath);
      if (masteredBuffer.length === 0) {
        throw new InternalServerErrorException('FFmpeg generated a 0-byte mastered audio payload');
      }

      // Quality Control Scan
      const qcReport = await this.audioQC.analyzeAudio(masteredBuffer, targetLufs);

      const sha256 = crypto.createHash('sha256').update(masteredBuffer).digest('hex');
      const latencyMs = Date.now() - startTime;

      const output: MasteredAudioOutput = {
        masteredBuffer,
        durationSeconds: qcReport.durationSeconds,
        sizeBytes: masteredBuffer.length,
        mimeType: 'audio/wav',
        integratedLufs: targetLufs,
        truePeakDb: truePeak,
        qcReport,
        sha256,
        generationMetadata: {
          loudnessProfile: loudnessProfile.toString(),
          targetLufs,
          duckingApplied: true,
          sfxCount: sfxCues.length,
          latencyMs,
          ffmpegCommand: `${ffmpegPath} ${ffmpegArgs.join(' ')}`,
        },
      };

      let asset: MediaAsset | undefined;
      if (this.mediaService && workspaceId && projectId) {
        const filename = `mastered_audio_${Date.now()}.wav`;
        asset = await this.mediaService.uploadAndSaveAsset(
          workspaceId,
          projectId,
          AssetType.AUDIO,
          filename,
          masteredBuffer,
          'audio/wav',
          shotId,
        );
      }

      this.eventEmitter.emit('audio.mastering.completed', {
        workspaceId,
        projectId,
        shotId,
        assetId: asset?.id,
        durationSeconds: output.durationSeconds,
        sizeBytes: output.sizeBytes,
        targetLufs,
        latencyMs,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `✅ Audio Mastering Completed [${output.durationSeconds}s, ${output.sizeBytes} bytes, ${targetLufs} LUFS, ${latencyMs}ms]`,
      );

      return { output, asset };
    } catch (err: any) {
      this.logger.error(`Audio mastering execution failed: ${err.message}`);
      this.eventEmitter.emit('audio.mastering.failed', {
        workspaceId,
        projectId,
        error: err.message,
      });
      throw new InternalServerErrorException(`Audio mastering failed: ${err.message}`);
    } finally {
      try {
        if (fs.existsSync(tempVoicePath)) fs.unlinkSync(tempVoicePath);
        if (fs.existsSync(tempMusicPath)) fs.unlinkSync(tempMusicPath);
        if (fs.existsSync(tempMasteredPath)) fs.unlinkSync(tempMasteredPath);
        for (const sfxP of sfxTempPaths) {
          if (fs.existsSync(sfxP)) fs.unlinkSync(sfxP);
        }
      } catch (_) {}
    }
  }
}
