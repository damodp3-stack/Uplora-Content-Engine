import { Injectable, Logger, InternalServerErrorException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IVoiceGenerationProvider,
  GenerateVoiceRequest,
  GenerateVoiceOutput,
} from '../interfaces/voice-generation-provider.interface';
import { EdgeNeuralVoiceProvider } from '../providers/edge-neural-voice.provider';
import { PiperOnnxVoiceProvider } from '../providers/piper-onnx-voice.provider';
import { WindowsSapiVoiceProvider } from '../providers/windows-sapi-voice.provider';
import { AudioQualityValidatorService } from './audio-quality-validator.service';
import { MediaService } from '../../media/media.service';
import { AssetType, MediaAsset } from '../../media/entities/media-asset.entity';

export interface GenerateVoiceServiceOptions extends GenerateVoiceRequest {
  workspaceId?: string;
  projectId?: string;
  shotId?: string;
  preferredProvider?: string;
}

export interface VoiceGenerationResult {
  output: GenerateVoiceOutput;
  asset?: MediaAsset;
  providerUsed: string;
  fallbackTriggered: boolean;
  version: number;
}

@Injectable()
export class VoiceGenerationService {
  private readonly logger = new Logger(VoiceGenerationService.name);
  private readonly providers: Map<string, IVoiceGenerationProvider> = new Map();
  private readonly versionMap: Map<string, number> = new Map();

  constructor(
    private readonly edgeNeuralProvider: EdgeNeuralVoiceProvider,
    private readonly piperOnnxProvider: PiperOnnxVoiceProvider,
    private readonly windowsSapiProvider: WindowsSapiVoiceProvider,
    private readonly audioValidator: AudioQualityValidatorService,
    private readonly eventEmitter: EventEmitter2,
    @Optional() private readonly mediaService?: MediaService,
  ) {

    this.registerProvider(this.edgeNeuralProvider);
    this.registerProvider(this.piperOnnxProvider);
    this.registerProvider(this.windowsSapiProvider);
  }

  public registerProvider(provider: IVoiceGenerationProvider): void {
    this.providers.set(provider.providerName.toLowerCase(), provider);
    this.logger.log(`Registered Voice Generation Provider: [${provider.providerName}]`);
  }

  public getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  public async generateVoice(options: GenerateVoiceServiceOptions): Promise<VoiceGenerationResult> {
    const startTime = Date.now();
    const { text, language = 'en', preferredProvider, workspaceId, projectId, shotId } = options;

    if (!text || text.trim().length === 0) {
      throw new InternalServerErrorException('Text narration prompt cannot be empty');
    }

    const versionKey = `${workspaceId || 'default'}_${projectId || 'default'}_${shotId || 'narration'}`;
    const currentVersion = (this.versionMap.get(versionKey) || 0) + 1;
    this.versionMap.set(versionKey, currentVersion);

    this.eventEmitter.emit('voice.generation.started', {
      text,
      language,
      workspaceId,
      projectId,
      version: currentVersion,
      timestamp: new Date().toISOString(),
    });

    // Provider priority fallback ordering: Preferred -> EdgeNeural -> PiperOnnx -> WindowsSapi
    const candidateProviders: IVoiceGenerationProvider[] = [];

    if (preferredProvider && this.providers.has(preferredProvider.toLowerCase())) {
      candidateProviders.push(this.providers.get(preferredProvider.toLowerCase())!);
    }

    if (!candidateProviders.includes(this.edgeNeuralProvider)) {
      candidateProviders.push(this.edgeNeuralProvider);
    }
    if (!candidateProviders.includes(this.piperOnnxProvider)) {
      candidateProviders.push(this.piperOnnxProvider);
    }
    if (!candidateProviders.includes(this.windowsSapiProvider)) {
      candidateProviders.push(this.windowsSapiProvider);
    }

    let output: GenerateVoiceOutput | null = null;
    let providerUsed = '';
    let fallbackTriggered = false;
    const attemptErrors: string[] = [];

    for (let i = 0; i < candidateProviders.length; i++) {
      const provider = candidateProviders[i];
      const providerStatus = await provider.getStatus();

      if (providerStatus !== 'AVAILABLE') {
        this.logger.warn(`Skipping provider [${provider.providerName}] - Status: ${providerStatus}`);
        continue;
      }

      if (!provider.supportsLanguage(language)) {
        this.logger.warn(`Skipping provider [${provider.providerName}] - Unsupported language: ${language}`);
        continue;
      }

      if (i > 0) {
        fallbackTriggered = true;
        this.logger.warn(`Triggering voice fallback to provider [${provider.providerName}] (Tier ${i + 1})`);
      }

      this.eventEmitter.emit('voice.generation.progress', {
        provider: provider.providerName,
        step: 'synthesizing',
        version: currentVersion,
        timestamp: new Date().toISOString(),
      });

      try {
        output = await provider.generateVoice(options);
        providerUsed = provider.providerName;
        break;
      } catch (err: any) {
        const errorMsg = `Provider [${provider.providerName}] failed: ${err.message}`;
        this.logger.warn(errorMsg);
        attemptErrors.push(errorMsg);
      }
    }

    if (!output) {
      const finalError = `Voice synthesis failed across all candidate providers: ${attemptErrors.join(' | ')}`;
      this.eventEmitter.emit('voice.generation.failed', {
        text,
        error: finalError,
        timestamp: new Date().toISOString(),
      });
      throw new InternalServerErrorException(finalError);
    }

    // Audio Quality Control probe
    const qcResult = await this.audioValidator.probeAudioBuffer(output.audioBuffer, output.mimeType);
    if (!qcResult.isValid) {
      this.logger.warn(`Audio QC Warning: ${qcResult.validationError}`);
    }

    let asset: MediaAsset | undefined;
    if (this.mediaService && workspaceId && projectId) {
      const filename = `narration_v${currentVersion}_${Date.now()}.${output.mimeType === 'audio/wav' ? 'wav' : 'mp3'}`;
      asset = await this.mediaService.uploadAndSaveAsset(
        workspaceId,
        projectId,
        AssetType.AUDIO,
        filename,
        output.audioBuffer,
        output.mimeType,
        shotId,
      );
    }

    const latencyMs = Date.now() - startTime;

    this.eventEmitter.emit('voice.generation.completed', {
      providerUsed,
      fallbackTriggered,
      durationSeconds: output.durationSeconds,
      sizeBytes: output.sizeBytes,
      version: currentVersion,
      assetId: asset?.id,
      latencyMs,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `✅ Voice Generation Completed [provider=${providerUsed}, duration=${output.durationSeconds}s, size=${output.sizeBytes}b, v${currentVersion}, ${latencyMs}ms]`,
    );

    return {
      output,
      asset,
      providerUsed,
      fallbackTriggered,
      version: currentVersion,
    };
  }

  public invalidateDownstream(contentId: string): void {
    this.versionMap.delete(contentId);
    this.eventEmitter.emit('voice.cache.invalidated', { contentId });
    this.logger.log(`Invalidated downstream narration cache for contentId: ${contentId}`);
  }
}
