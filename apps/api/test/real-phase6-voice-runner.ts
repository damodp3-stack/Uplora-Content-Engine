import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VoiceGenerationModule } from '../src/modules/voice-generation/voice-generation.module';
import { VoiceGenerationService } from '../src/modules/voice-generation/services/voice-generation.service';
import { EdgeNeuralVoiceProvider } from '../src/modules/voice-generation/providers/edge-neural-voice.provider';
import { PiperOnnxVoiceProvider } from '../src/modules/voice-generation/providers/piper-onnx-voice.provider';
import { WindowsSapiVoiceProvider } from '../src/modules/voice-generation/providers/windows-sapi-voice.provider';
import { AudioQualityValidatorService } from '../src/modules/voice-generation/services/audio-quality-validator.service';
import { FfmpegKeyframeMotionProvider } from '../src/modules/video-generation/providers/ffmpeg-keyframe-motion.provider';
import { MediaService } from '../src/modules/media/media.service';

const execFileAsync = promisify(execFile);



async function runRealPhase6Verification() {
  console.log('====================================================');
  console.log('  UPLORA CONTENT ENGINE - PHASE 6 REAL VOICE VERIFICATION');
  console.log('====================================================\n');

  const scratchDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }

  const mockMediaService = {
    uploadAndSaveAsset: async (workspaceId: string, projectId: string, assetType: any, filename: string, buffer: Buffer, mimeType: string) => ({
      id: `asset_${Date.now()}`,
      workspaceId,
      projectId,
      assetType,
      storageKey: `${workspaceId}/${projectId}/${filename}`,
      mimeType,
      size: buffer.length,
      status: 'AVAILABLE',
    }),
    markAssetAvailable: async (id: string, workspaceId: string, meta: any) => ({
      id,
      workspaceId,
      status: 'AVAILABLE',
      ...meta,
    }),
    findByProjectAndShot: async () => [],
  };

  const module: TestingModule = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot()],
    providers: [
      VoiceGenerationService,
      EdgeNeuralVoiceProvider,
      PiperOnnxVoiceProvider,
      WindowsSapiVoiceProvider,
      AudioQualityValidatorService,
      FfmpegKeyframeMotionProvider,
      { provide: MediaService, useValue: mockMediaService },
    ],
  }).compile();




  const voiceService = module.get<VoiceGenerationService>(VoiceGenerationService);
  const audioQC = module.get<AudioQualityValidatorService>(AudioQualityValidatorService);
  const motionProvider = module.get<FfmpegKeyframeMotionProvider>(FfmpegKeyframeMotionProvider);

  // 1. English Narration Real Generation
  console.log('1. Synthesizing Real English Narration Audio...');
  const enStartTime = Date.now();
  const enResult = await voiceService.generateVoice({
    text: 'Welcome to Uplora Content Engine. Autonomous AI powered high quality video generation with real voice synthesis.',
    language: 'en',
  });
  const enLatencyMs = Date.now() - enStartTime;

  const enAudioPath = path.join(scratchDir, `real_phase6_en_narration.${enResult.output.mimeType === 'audio/wav' ? 'wav' : 'mp3'}`);
  fs.writeFileSync(enAudioPath, enResult.output.audioBuffer);

  const enAudioQC = await audioQC.probeAudioBuffer(enResult.output.audioBuffer, enResult.output.mimeType);
  console.log(`   ✅ English Audio Generated [Provider: ${enResult.providerUsed}]`);
  console.log(`      File: ${enAudioPath}`);
  console.log(`      Size: ${enAudioQC.sizeBytes} bytes | Duration: ${enAudioQC.durationSeconds}s | Latency: ${enLatencyMs}ms`);
  console.log(`      Sample Rate: ${enAudioQC.sampleRate}Hz | Channels: ${enAudioQC.channels} | Codec: ${enAudioQC.codec}\n`);

  // 2. Tamil Narration Real Generation
  console.log('2. Synthesizing Real Tamil Narration Audio...');
  const taStartTime = Date.now();
  const taResult = await voiceService.generateVoice({
    text: 'வணக்கம்! அப்லோரா தயாரிப்புக்கான தானியங்கி குரல் உருவாக்கம் வெற்றிகரமாக இயங்குகிறது.',
    language: 'ta',
  });
  const taLatencyMs = Date.now() - taStartTime;

  const taAudioPath = path.join(scratchDir, `real_phase6_ta_narration.${taResult.output.mimeType === 'audio/wav' ? 'wav' : 'mp3'}`);
  fs.writeFileSync(taAudioPath, taResult.output.audioBuffer);

  const taAudioQC = await audioQC.probeAudioBuffer(taResult.output.audioBuffer, taResult.output.mimeType);
  console.log(`   ✅ Tamil Audio Generated [Provider: ${taResult.providerUsed}]`);
  console.log(`      File: ${taAudioPath}`);
  console.log(`      Size: ${taAudioQC.sizeBytes} bytes | Duration: ${taAudioQC.durationSeconds}s | Latency: ${taLatencyMs}ms`);
  console.log(`      Sample Rate: ${taAudioQC.sampleRate}Hz | Channels: ${taAudioQC.channels} | Codec: ${taAudioQC.codec}\n`);

  // 3. Synthesize Base Keyframe Video (768x1344, 9:16 aspect ratio)
  console.log('3. Synthesizing Base 9:16 Motion Keyframe Video (768x1344)...');
  const baseImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  const motionVideo = await motionProvider.generateVideoClip({
    imageBuffer: baseImageBuffer,
    durationSeconds: 4,
    width: 768,
    height: 1344,
    motionPreset: 'slow_zoom_in',
    fps: 30,
  });
  console.log(`   ✅ Base Motion Video Clip Generated (${motionVideo.sizeBytes} bytes, 768x1344, 9:16 aspect ratio)\n`);

  // 4. Mux English Narration Audio + Keyframe Video
  console.log('4. Muxing English Narration Audio with 9:16 Video Clip via FFmpeg...');
  const enMuxStartTime = Date.now();
  const enMuxResult = await motionProvider.muxAudioVideo({
    videoBuffer: motionVideo.videoBuffer,
    audioBuffer: enResult.output.audioBuffer,
    durationSeconds: enResult.output.durationSeconds,
    width: 768,
    height: 1344,
  });
  const enMuxLatencyMs = Date.now() - enMuxStartTime;

  const enFinalVideoPath = path.join(scratchDir, 'real_phase6_final_en.mp4');
  fs.writeFileSync(enFinalVideoPath, enMuxResult.videoBuffer);

  console.log(`   ✅ English Final MP4 Muxed Successfully!`);
  console.log(`      File: ${enFinalVideoPath}`);
  console.log(`      Size: ${enMuxResult.sizeBytes} bytes | Latency: ${enMuxLatencyMs}ms`);
  console.log(`      Codecs: Video [${enMuxResult.videoCodec}], Audio [${enMuxResult.audioCodec}]\n`);

  // 5. Mux Tamil Narration Audio + Keyframe Video
  console.log('5. Muxing Tamil Narration Audio with 9:16 Video Clip via FFmpeg...');
  const taMuxStartTime = Date.now();
  const taMuxResult = await motionProvider.muxAudioVideo({
    videoBuffer: motionVideo.videoBuffer,
    audioBuffer: taResult.output.audioBuffer,
    durationSeconds: taResult.output.durationSeconds,
    width: 768,
    height: 1344,
  });
  const taMuxLatencyMs = Date.now() - taMuxStartTime;

  const taFinalVideoPath = path.join(scratchDir, 'real_phase6_final_ta.mp4');
  fs.writeFileSync(taFinalVideoPath, taMuxResult.videoBuffer);

  console.log(`   ✅ Tamil Final MP4 Muxed Successfully!`);
  console.log(`      File: ${taFinalVideoPath}`);
  console.log(`      Size: ${taMuxResult.sizeBytes} bytes | Latency: ${taMuxLatencyMs}ms`);
  console.log(`      Codecs: Video [${taMuxResult.videoCodec}], Audio [${taMuxResult.audioCodec}]\n`);

  // 6. FFprobe Validation of Final Muxed MP4 Videos
  console.log('6. Probing Final MP4 Videos with FFprobe...');
  const ffmpegPath = path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe');
  
  try {
    const { stderr: enProbeOut } = await execFileAsync(ffmpegPath, ['-i', enFinalVideoPath]);
    console.log('--- English Final MP4 FFprobe Summary ---');
    console.log(enProbeOut.split('\n').filter(l => l.includes('Input #0') || l.includes('Stream #0') || l.includes('Duration')).join('\n'));
  } catch (err: any) {
    console.log('--- English Final MP4 FFprobe Summary ---');
    console.log((err.stderr || err.message || '').split('\n').filter((l: string) => l.includes('Input #0') || l.includes('Stream #0') || l.includes('Duration')).join('\n'));
  }

  try {
    const { stderr: taProbeOut } = await execFileAsync(ffmpegPath, ['-i', taFinalVideoPath]);
    console.log('\n--- Tamil Final MP4 FFprobe Summary ---');
    console.log(taProbeOut.split('\n').filter(l => l.includes('Input #0') || l.includes('Stream #0') || l.includes('Duration')).join('\n'));
  } catch (err: any) {
    console.log('\n--- Tamil Final MP4 FFprobe Summary ---');
    console.log((err.stderr || err.message || '').split('\n').filter((l: string) => l.includes('Input #0') || l.includes('Stream #0') || l.includes('Duration')).join('\n'));
  }

  console.log('\n====================================================');
  console.log('  PHASE 6 REAL VERIFICATION COMPLETED WITH CLEAN SUCCESS');
  console.log('====================================================');
}

runRealPhase6Verification().catch((err) => {
  console.error('❌ Phase 6 Real Verification Failed:', err);
  process.exit(1);
});
