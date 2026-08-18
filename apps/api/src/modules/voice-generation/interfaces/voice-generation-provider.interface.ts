export interface GenerateVoiceRequest {
  text: string;
  language?: string; // e.g. 'en', 'ta', 'en-US', 'ta-IN'
  voiceId?: string;  // e.g. 'en-US-AvaNeural', 'ta-IN-PallaviNeural', 'Microsoft Zira Desktop'
  gender?: 'female' | 'male';
  speakingRate?: number; // 0.5 to 2.0
  pitch?: number;
  outputFormat?: 'mp3' | 'wav';
}

export interface VoiceGenerationMetadata {
  provider: string;
  voiceId: string;
  language: string;
  gender?: string;
  latencyMs: number;
  attempts?: number;
}

export interface GenerateVoiceOutput {
  audioBuffer: Buffer;
  mimeType: 'audio/mpeg' | 'audio/wav';
  durationSeconds: number;
  sizeBytes: number;
  sampleRate: number;
  channels: number;
  codec: string;
  sha256: string;
  generationMetadata: VoiceGenerationMetadata;
}

export interface IVoiceGenerationProvider {
  readonly providerName: string;
  getStatus(): Promise<'AVAILABLE' | 'UNAVAILABLE'>;
  supportsLanguage(language: string): boolean;
  generateVoice(request: GenerateVoiceRequest): Promise<GenerateVoiceOutput>;
}
