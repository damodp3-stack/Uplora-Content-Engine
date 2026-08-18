export type MotionPreset =
  | 'slow_zoom_in'
  | 'slow_zoom_out'
  | 'pan_left'
  | 'pan_right'
  | 'pan_up'
  | 'pan_down'
  | 'subtle_parallax'
  | 'static_hold';

export interface KeyframeMotionRequest {
  imageBuffer: Buffer;
  durationSeconds: number;
  width: number;
  height: number;
  motionPreset?: MotionPreset;
  fps?: number;
  outputFormat?: 'mp4';
}

export interface KeyframeMotionOutput {
  videoBuffer: Buffer;
  durationSeconds: number;
  width: number;
  height: number;
  mimeType: string;
  codec: string;
  sha256: string;
  sizeBytes: number;
  generationMetadata: {
    provider: string;
    motionPreset: MotionPreset;
    fps: number;
    frameCount: number;
    latencyMs: number;
    ffmpegCommand?: string;
  };
}

export interface AudioVideoMuxRequest {
  videoBuffer: Buffer;
  audioBuffer: Buffer;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
}

export interface AudioVideoMuxOutput {
  videoBuffer: Buffer;
  durationSeconds: number;
  width: number;
  height: number;
  mimeType: 'video/mp4';
  videoCodec: 'h264';
  audioCodec: 'aac';
  sha256: string;
  sizeBytes: number;
  generationMetadata: {
    provider: string;
    latencyMs: number;
    ffmpegCommand?: string;
  };
}

export interface IKeyframeMotionProvider {
  readonly providerName: string;
  getStatus(): Promise<'AVAILABLE' | 'UNAVAILABLE'>;
  generateVideoClip(request: KeyframeMotionRequest): Promise<KeyframeMotionOutput>;
  muxAudioVideo(request: AudioVideoMuxRequest): Promise<AudioVideoMuxOutput>;
}
