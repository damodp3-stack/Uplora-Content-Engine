export type LoudnessProfile = 'REELS' | 'SHORTS' | 'PODCAST' | 'CUSTOM';

export interface SfxCue {
  sfxId?: 'whoosh' | 'pop' | 'impact' | 'chime' | string;
  timestampSeconds: number;
  volume?: number; // 0.0 to 1.0, default 0.4
}

export interface AudioMasteringOptions {
  voiceBuffer: Buffer;
  musicCategory?: 'ambient' | 'corporate' | 'lofi' | 'energetic' | 'procedural';
  musicBuffer?: Buffer;
  sfxCues?: SfxCue[];
  loudnessProfile?: LoudnessProfile;
  targetLufs?: number;
  truePeak?: number;
  duckingThreshold?: number; // default 0.08
  duckingRatio?: number;     // default 6
  workspaceId?: string;
  projectId?: string;
  shotId?: string;
}

export interface AudioQcReport {
  durationSeconds: number;
  sampleRate: number;
  channels: number;
  integratedLufs: number;
  truePeakDb: number;
  hasSilence: boolean;
  hasClipping: boolean;
  isValid: boolean;
  qcWarnings: string[];
}

export interface MasteredAudioOutput {
  masteredBuffer: Buffer;
  durationSeconds: number;
  sizeBytes: number;
  mimeType: 'audio/wav' | 'audio/mpeg';
  integratedLufs: number;
  truePeakDb: number;
  qcReport: AudioQcReport;
  sha256: string;
  generationMetadata: {
    loudnessProfile: string;
    targetLufs: number;
    duckingApplied: boolean;
    sfxCount: number;
    latencyMs: number;
    ffmpegCommand?: string;
  };
}
