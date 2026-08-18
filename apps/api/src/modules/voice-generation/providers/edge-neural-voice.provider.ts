import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as https from 'https';
import * as crypto from 'crypto';
import {
  IVoiceGenerationProvider,
  GenerateVoiceRequest,
  GenerateVoiceOutput,
} from '../interfaces/voice-generation-provider.interface';
import { AudioQualityValidatorService } from '../services/audio-quality-validator.service';

@Injectable()
export class EdgeNeuralVoiceProvider implements IVoiceGenerationProvider {
  public readonly providerName = 'edge-neural';
  private readonly logger = new Logger(EdgeNeuralVoiceProvider.name);

  constructor(private readonly audioValidator: AudioQualityValidatorService) {}

  public async getStatus(): Promise<'AVAILABLE' | 'UNAVAILABLE'> {
    return 'AVAILABLE';
  }

  public supportsLanguage(language: string): boolean {
    if (!language) return true;
    const lang = language.toLowerCase();
    return lang.startsWith('en') || lang.startsWith('ta');
  }

  private fetchTtsAudio(url: string, timeoutMs: number = 8000): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const options = {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
      };

      const req = https.get(url, options, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Hosted Neural TTS endpoint returned status code ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          if (buffer.length === 0) {
            reject(new Error('Received 0-byte audio payload from hosted endpoint'));
          } else {
            resolve(buffer);
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.setTimeout(timeoutMs, () => {
        req.destroy();
        reject(new Error(`Hosted Neural TTS request timed out after ${timeoutMs}ms`));
      });
    });
  }

  public async generateVoice(request: GenerateVoiceRequest): Promise<GenerateVoiceOutput> {
    const startTime = Date.now();
    const { text, language = 'en', voiceId } = request;

    if (!text || text.trim().length === 0) {
      throw new InternalServerErrorException('Cannot generate audio for empty text prompt');
    }

    const cleanLang = language.toLowerCase().startsWith('ta') ? 'ta' : 'en';
    const targetVoiceId = voiceId || (cleanLang === 'ta' ? 'ta-IN-PallaviNeural' : 'en-US-AvaNeural');

    const encodedText = encodeURIComponent(text.trim());
    const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${cleanLang}&client=tw-ob`;

    this.logger.log(`Initiating Edge Neural Voice Synthesis [lang=${cleanLang}, voice=${targetVoiceId}]`);

    let lastError: Error | null = null;
    let audioBuffer: Buffer | null = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        audioBuffer = await this.fetchTtsAudio(ttsUrl, 8000);
        break;
      } catch (err: any) {
        lastError = err;
        this.logger.warn(`Edge Neural TTS Attempt ${attempt}/${maxRetries} failed: ${err.message}`);
        if (attempt < maxRetries) {
          await new Promise((res) => setTimeout(res, 500 * attempt));
        }
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new InternalServerErrorException(
        `Edge Neural Voice synthesis failed after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      );
    }

    const sha256 = crypto.createHash('sha256').update(audioBuffer).digest('hex');
    const qcResult = await this.audioValidator.probeAudioBuffer(audioBuffer, 'audio/mpeg');
    const latencyMs = Date.now() - startTime;

    this.logger.log(
      `✅ Edge Neural Voice generated successfully (${qcResult.durationSeconds}s, ${audioBuffer.length} bytes, ${latencyMs}ms, SHA: ${sha256.substring(
        0,
        8,
      )})`,
    );

    return {
      audioBuffer,
      mimeType: 'audio/mpeg',
      durationSeconds: qcResult.durationSeconds,
      sizeBytes: audioBuffer.length,
      sampleRate: qcResult.sampleRate,
      channels: qcResult.channels,
      codec: qcResult.codec,
      sha256,
      generationMetadata: {
        provider: this.providerName,
        voiceId: targetVoiceId,
        language: cleanLang,
        latencyMs,
        attempts: maxRetries,
      },
    };
  }
}
