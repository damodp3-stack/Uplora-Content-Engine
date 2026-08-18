import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

@Injectable()
export class SoundLibraryService {
  private readonly logger = new Logger(SoundLibraryService.name);
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

  public async getBackgroundMusic(
    category: 'ambient' | 'corporate' | 'lofi' | 'energetic' | 'procedural' = 'ambient',
    durationSeconds: number = 10,
  ): Promise<Buffer> {
    this.logger.log(`Fetching CC0 Royalty-Free Background Music [category=${category}, duration=${durationSeconds}s]`);

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const outputMusicPath = path.join(scratchDir, `bg_music_${tempId}.mp3`);
    const ffmpegPath = this.detectFfmpegPath();

    // Procedural ambient chord synthesizer via aevalsrc
    let expr = '0.08*sin(2*PI*220*t)+0.04*sin(2*PI*330*t)+0.04*sin(2*PI*440*t)';
    if (category === 'corporate' || category === 'energetic') {
      expr = '0.08*sin(2*PI*261.63*t)+0.04*sin(2*PI*329.63*t)+0.04*sin(2*PI*392.00*t)';
    } else if (category === 'lofi') {
      expr = '0.07*sin(2*PI*174.61*t)+0.05*sin(2*PI*220*t)+0.03*sin(2*PI*261.63*t)';
    }

    const ffmpegArgs = [
      '-f',
      'lavfi',
      '-i',
      `aevalsrc=${expr}:d=${Math.ceil(durationSeconds)}`,
      '-c:a',
      'libmp3lame',
      '-b:a',
      '128k',
      '-y',
      outputMusicPath,
    ];

    try {
      await execFileAsync(ffmpegPath, ffmpegArgs);
      if (!fs.existsSync(outputMusicPath)) {
        throw new InternalServerErrorException('Background music audio file synthesis failed');
      }

      const musicBuffer = fs.readFileSync(outputMusicPath);
      this.logger.log(`✅ Background Music synthesized cleanly (${musicBuffer.length} bytes)`);
      return musicBuffer;
    } catch (err: any) {
      this.logger.error(`Background music synthesis error: ${err.message}`);
      throw new InternalServerErrorException(`Background music synthesis failed: ${err.message}`);
    } finally {
      try {
        if (fs.existsSync(outputMusicPath)) fs.unlinkSync(outputMusicPath);
      } catch (_) {}
    }
  }

  public async getSoundEffect(
    sfxType: 'whoosh' | 'pop' | 'impact' | 'chime' | string = 'whoosh',
  ): Promise<Buffer> {
    this.logger.log(`Fetching CC0 Sound Effect [type=${sfxType}]`);

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const outputSfxPath = path.join(scratchDir, `sfx_${tempId}.wav`);
    const ffmpegPath = this.detectFfmpegPath();

    let expr = '0.2*sin(2*PI*440*t*t):d=0.5'; // default whoosh sweep
    if (sfxType === 'pop') {
      expr = '0.3*sin(2*PI*880*(1-t)):d=0.15';
    } else if (sfxType === 'impact') {
      expr = '0.4*sin(2*PI*110*(1-t*2)):d=0.4';
    } else if (sfxType === 'chime') {
      expr = '0.15*sin(2*PI*1046.50*t)+0.15*sin(2*PI*1318.51*t):d=0.6';
    }

    const ffmpegArgs = [
      '-f',
      'lavfi',
      '-i',
      `aevalsrc=${expr}`,
      '-c:a',
      'pcm_s16le',
      '-y',
      outputSfxPath,
    ];

    try {
      await execFileAsync(ffmpegPath, ffmpegArgs);
      if (!fs.existsSync(outputSfxPath)) {
        throw new InternalServerErrorException('SFX synthesis file failed');
      }

      const sfxBuffer = fs.readFileSync(outputSfxPath);
      this.logger.log(`✅ SFX synthesized cleanly (${sfxBuffer.length} bytes)`);
      return sfxBuffer;
    } catch (err: any) {
      this.logger.error(`SFX synthesis error: ${err.message}`);
      throw new InternalServerErrorException(`SFX synthesis failed: ${err.message}`);
    } finally {
      try {
        if (fs.existsSync(outputSfxPath)) fs.unlinkSync(outputSfxPath);
      } catch (_) {}
    }
  }
}
