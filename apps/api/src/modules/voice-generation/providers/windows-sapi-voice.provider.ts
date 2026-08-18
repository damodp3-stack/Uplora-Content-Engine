import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import {
  IVoiceGenerationProvider,
  GenerateVoiceRequest,
  GenerateVoiceOutput,
} from '../interfaces/voice-generation-provider.interface';
import { AudioQualityValidatorService } from '../services/audio-quality-validator.service';

const execFileAsync = promisify(execFile);

@Injectable()
export class WindowsSapiVoiceProvider implements IVoiceGenerationProvider {
  public readonly providerName = 'windows-sapi';
  private readonly logger = new Logger(WindowsSapiVoiceProvider.name);

  constructor(private readonly audioValidator: AudioQualityValidatorService) {}

  public async getStatus(): Promise<'AVAILABLE' | 'UNAVAILABLE'> {
    return process.platform === 'win32' ? 'AVAILABLE' : 'UNAVAILABLE';
  }

  public supportsLanguage(language: string): boolean {
    if (!language) return true;
    const lang = language.toLowerCase();
    return lang.startsWith('en') || lang.startsWith('ta');
  }

  public async generateVoice(request: GenerateVoiceRequest): Promise<GenerateVoiceOutput> {
    const startTime = Date.now();
    const { text, language = 'en', voiceId, gender } = request;

    if (!text || text.trim().length === 0) {
      throw new InternalServerErrorException('Cannot generate audio for empty text prompt');
    }

    const scratchDir = path.join(process.cwd(), 'scratch');
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }

    const tempId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const scriptPath = path.join(scratchDir, `sapi_script_${tempId}.ps1`);
    const outputWavPath = path.join(scratchDir, `sapi_output_${tempId}.wav`);

    const selectedVoice =
      voiceId ||
      (gender === 'female' ? 'Microsoft Zira Desktop' : 'Microsoft David Desktop');

    const escapedText = text.replace(/"/g, '`"').replace(/'/g, "''");

    const psContent = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
    $synth.SelectVoice('${selectedVoice}')
} catch {
    # Fallback to default installed voice if preferred voice is unavailable
}
$synth.SetOutputToWaveFile('${outputWavPath.replace(/\\/g, '\\\\')}')
$synth.Speak("${escapedText}")
$synth.Dispose()
`;

    fs.writeFileSync(scriptPath, psContent, 'utf-8');

    this.logger.log(`Initiating Windows SAPI5 Offline Voice Synthesis [voice=${selectedVoice}]`);

    try {
      await execFileAsync('powershell.exe', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        scriptPath,
      ]);

      if (!fs.existsSync(outputWavPath)) {
        throw new InternalServerErrorException(`Windows SAPI audio file was not generated: ${outputWavPath}`);
      }

      const audioBuffer = fs.readFileSync(outputWavPath);
      if (audioBuffer.length === 0) {
        throw new InternalServerErrorException('Windows SAPI generated a 0-byte audio payload');
      }

      const sha256 = crypto.createHash('sha256').update(audioBuffer).digest('hex');
      const qcResult = await this.audioValidator.probeAudioBuffer(audioBuffer, 'audio/wav');
      const latencyMs = Date.now() - startTime;

      this.logger.log(
        `✅ Windows SAPI Voice generated successfully (${qcResult.durationSeconds}s, ${audioBuffer.length} bytes, ${latencyMs}ms, SHA: ${sha256.substring(
          0,
          8,
        )})`,
      );

      return {
        audioBuffer,
        mimeType: 'audio/wav',
        durationSeconds: qcResult.durationSeconds,
        sizeBytes: audioBuffer.length,
        sampleRate: qcResult.sampleRate,
        channels: qcResult.channels,
        codec: 'pcm_s16le',
        sha256,
        generationMetadata: {
          provider: this.providerName,
          voiceId: selectedVoice,
          language,
          gender,
          latencyMs,
        },
      };
    } catch (err: any) {
      this.logger.error(`Windows SAPI synthesis execution error: ${err.message}`);
      throw new InternalServerErrorException(`Windows SAPI offline synthesis failed: ${err.message}`);
    } finally {
      try {
        if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
        if (fs.existsSync(outputWavPath)) fs.unlinkSync(outputWavPath);
      } catch (_) {}
    }
  }
}
