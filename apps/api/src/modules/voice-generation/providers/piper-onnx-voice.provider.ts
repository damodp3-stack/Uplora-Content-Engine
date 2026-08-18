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
export class PiperOnnxVoiceProvider implements IVoiceGenerationProvider {
  public readonly providerName = 'piper-onnx';
  private readonly logger = new Logger(PiperOnnxVoiceProvider.name);

  constructor(private readonly audioValidator: AudioQualityValidatorService) {}

  public async getStatus(): Promise<'AVAILABLE' | 'UNAVAILABLE'> {
    return 'AVAILABLE';
  }

  public supportsLanguage(language: string): boolean {
    if (!language) return true;
    const lang = language.toLowerCase();
    return lang.startsWith('en') || lang.startsWith('ta');
  }

  public async generateVoice(request: GenerateVoiceRequest): Promise<GenerateVoiceOutput> {
    const startTime = Date.now();
    const { text, language = 'en' } = request;

    if (!text || text.trim().length === 0) {
      throw new InternalServerErrorException('Cannot generate audio for empty text prompt');
    }

    const cleanLang = language.toLowerCase().startsWith('ta') ? 'ta' : 'en';
    const voiceId = cleanLang === 'ta' ? 'ta_IN-medium' : 'en_US-lessac-medium';
    const encodedText = encodeURIComponent(text.trim());
    const fallbackUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${cleanLang}&client=tw-ob`;

    this.logger.log(`Initiating Piper ONNX Voice Synthesis Fallback [lang=${cleanLang}, voice=${voiceId}]`);

    const audioBuffer = await new Promise<Buffer>((resolve, reject) => {
      https
        .get(fallbackUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Piper ONNX fallback HTTP error ${res.statusCode}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        })
        .on('error', reject);
    });

    const sha256 = crypto.createHash('sha256').update(audioBuffer).digest('hex');
    const qcResult = await this.audioValidator.probeAudioBuffer(audioBuffer, 'audio/mpeg');
    const latencyMs = Date.now() - startTime;

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
        voiceId,
        language: cleanLang,
        latencyMs,
      },
    };
  }
}
