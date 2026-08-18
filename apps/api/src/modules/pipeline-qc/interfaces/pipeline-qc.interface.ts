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
  | 'SCRIPT_TIMING'
  | 'MEDIA_STORAGE'
  | 'AV_SYNC';

export interface ShotValidationResult {
  shotIndex: number;
  expectedDurationSeconds: number;
  actualVideoDurationSeconds: number;
  imagePath?: string;
  imageExists: boolean;
  imageValid: boolean;
  timelineStartSeconds: number;
  timelineEndSeconds: number;
  hasGap: boolean;
  hasOverlap: boolean;
  isOrderCorrect: boolean;
}

export interface ShotTimelineReport {
  totalShots: number;
  validShots: number;
  hasMissingShots: boolean;
  hasOverlappingShots: boolean;
  hasTimelineGaps: boolean;
  shotDetails: ShotValidationResult[];
}

export interface EbuLufsReport {
  integratedLufs: number;
  targetIntegratedLufs: number;
  lufsDelta: number;
  truePeakDb: number;
  maxTruePeakDb: number;
  loudnessRangeLra: number;
  isLufsPassed: boolean;
  isTruePeakPassed: boolean;
}

export interface WpmTimingReport {
  wordCount: number;
  narrationDurationSeconds: number;
  actualWpm: number;
  minimumWpm: number;
  maximumWpm: number;
  isWpmPassed: boolean;
}

export interface ImageQcReport {
  filePath?: string;
  fileExists: boolean;
  fileSizeBytes: number;
  magicBytesValid: boolean;
  width: number;
  height: number;
  aspectRatio: string;
  isAspectRatioValid: boolean;
  isReadable: boolean;
}

export interface VideoQcReport {
  filePath?: string;
  fileExists: boolean;
  fileSizeBytes: number;
  isContainerReadable: boolean;
  videoStreamExists: boolean;
  codec: string;
  profile?: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  bitrate: number;
  frameCount: number;
  isFrameExtractionValid: boolean; // Proven by FFmpeg test frame extraction
}

export interface AudioQcReport {
  streamExists: boolean;
  codec: string;
  sampleRate: number;
  channels: number;
  durationSeconds: number;
  bitrate: number;
  hasAudioClipping: boolean;
  hasSilenceGap: boolean;
  ebuLufsReport: EbuLufsReport;
}

export interface CriticalQcReport {
  criticalGatesPassed: boolean;
  failedCriticalGates: CriticalQcGate[];
  avSyncDeltaMs: number;
  avSyncFrameTolerance: number; // 50ms converted to frames @ actual FPS (e.g. 1.5 frames @ 30fps)
  endTimestampMatchMs: number;
  videoQcReport: VideoQcReport;
  audioQcReport: AudioQcReport;
  wpmReport: WpmTimingReport;
  shotTimelineReport?: ShotTimelineReport;
  fileExists: boolean;
  fileSizeBytes: number;
  checksumValid: boolean;
}

export interface QualityScoreBreakdown {
  scriptTimingScore: number;       // Max 20
  imageQualityScore: number;       // Max 15
  videoMotionScore: number;        // Max 20
  audioMasteringScore: number;     // Max 20
  avSyncScore: number;             // Max 15
  mediaPersistenceScore: number;   // Max 10
  overallScore: number;            // Max 100
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
  stage: SelfHealingStage;
  measuredValue: any;
  expectedValue: any;
  recoveryAttempts: number;
  stageFailures: SelfHealingStage[];
  criticalFailures: CriticalQcGate[];
  timestamp: string;
  finalStatus: 'AVAILABLE' | 'FAILED';
}

export interface PipelineJobContext {
  jobId: string;
  workspaceId: string;
  projectId: string;
  shotId?: string;
  prompt: string;
  scriptText?: string;
  language: 'en-US' | 'ta-IN' | string;
  voiceId?: string;
  targetDurationSeconds: number;
  targetLufs?: number;
  currentAttempt: number;
  maxAttempts: number;
  stageHistory: SelfHealingStage[];
}
