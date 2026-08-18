export type CriticalQcGate =
  | 'AV_SYNC'
  | 'CORRUPT_MEDIA'
  | 'MISSING_VIDEO_STREAM'
  | 'MISSING_AUDIO_STREAM'
  | 'FILE_NOT_FOUND'
  | 'CHECKSUM_MISMATCH'
  | 'AUDIO_CLIPPING'
  | 'UNSAFE_CONTENT'
  | 'PRODUCTION_READINESS';

export type SelfHealingStage =
  | 'AUDIO_MASTERING'
  | 'TTS_NARRATION'
  | 'VIDEO_MOTION'
  | 'IMAGE_GENERATION'
  | 'SCRIPT_TIMING';

export interface QualityScoreBreakdown {
  scriptTimingScore: number;       // Max 20
  imageQualityScore: number;       // Max 15
  videoMotionScore: number;        // Max 20
  audioMasteringScore: number;     // Max 20
  avSyncScore: number;             // Max 15
  mediaPersistenceScore: number;   // Max 10
  overallScore: number;            // Max 100
}

export interface CriticalQcReport {
  criticalGatesPassed: boolean;
  failedCriticalGates: CriticalQcGate[];
  avSyncDeltaMs: number;
  endTimestampMatchMs: number;
  videoCodec?: string;
  videoWidth?: number;
  videoHeight?: number;
  audioCodec?: string;
  audioSampleRate?: number;
  fileExists: boolean;
  fileSizeBytes: number;
  checksumValid: boolean;
  hasAudioClipping: boolean;
  hasSilenceGap: boolean;
}

export interface PipelineQcResult {
  passed: boolean;
  overallScore: number;
  criticalGatesPassed: boolean;
  isProductionReady: boolean;
  scoreBreakdown: QualityScoreBreakdown;
  criticalReport: CriticalQcReport;
  warnings: string[];
}

export interface DiagnosticReport {
  jobId: string;
  failedCriterion: string;
  measuredValue: any;
  expectedValue: any;
  recoveryAttempts: number;
  stageFailures: SelfHealingStage[];
  timestamp: string;
  finalStatus: 'AVAILABLE' | 'FAILED';
}

export interface PipelineJobContext {
  jobId: string;
  workspaceId: string;
  projectId: string;
  shotId?: string;
  prompt: string;
  language: 'en-US' | 'ta-IN' | string;
  voiceId?: string;
  targetDurationSeconds: number; // e.g. 30.0
  currentAttempt: number;
  maxAttempts: number; // default 3
  stageHistory: SelfHealingStage[];
}
