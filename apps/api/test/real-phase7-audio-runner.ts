import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { VoiceGenerationService } from '../src/modules/voice-generation/services/voice-generation.service';
import { EdgeNeuralVoiceProvider } from '../src/modules/voice-generation/providers/edge-neural-voice.provider';
import { PiperOnnxVoiceProvider } from '../src/modules/voice-generation/providers/piper-onnx-voice.provider';
import { WindowsSapiVoiceProvider } from '../src/modules/voice-generation/providers/windows-sapi-voice.provider';
import { AudioQualityValidatorService } from '../src/modules/voice-generation/services/audio-quality-validator.service';
import { AudioMasteringService } from '../src/modules/audio-studio/services/audio-mastering.service';
import { SoundLibraryService } from '../src/modules/audio-studio/services/sound-library.service';
import { AudioQcService } from '../src/modules/audio-studio/services/audio-qc.service';
import { FfmpegKeyframeMotionProvider } from '../src/modules/video-generation/providers/ffmpeg-keyframe-motion.provider';
import { MediaService } from '../src/modules/media/media.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

async function runRealPhase7Verification() {
  console.log('\n======================================================');
  console.log('🚀 UPLORA CONTENT ENGINE — PHASE 7 REAL SYSTEM VERIFICATION');
  console.log('   Audio mastering, Voice Ducking, CC0 Music, SFX & Final MP4 Mux');
  console.log('======================================================\n');

  // Candidate root scratch directory
  const candidateScratchDirs = [
    path.join(process.cwd(), '..', '..', 'scratch'),
    path.join(process.cwd(), '..', 'scratch'),
    path.join(process.cwd(), 'scratch'),
    'd:/Content Creation Engine/scratch',
  ];

  let scratchDir = path.join(process.cwd(), 'scratch');
  for (const dir of candidateScratchDirs) {
    if (fs.existsSync(dir)) {
      scratchDir = dir;
      break;
    }
  }

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
  };

  const module: TestingModule = await Test.createTestingModule({
    imports: [EventEmitterModule.forRoot()],
    providers: [
      VoiceGenerationService,
      EdgeNeuralVoiceProvider,
      PiperOnnxVoiceProvider,
      WindowsSapiVoiceProvider,
      AudioQualityValidatorService,
      AudioMasteringService,
      SoundLibraryService,
      AudioQcService,
      FfmpegKeyframeMotionProvider,
      { provide: MediaService, useValue: mockMediaService },
    ],
  }).compile();

  try {
    const voiceService = module.get(VoiceGenerationService);
    const masteringService = module.get(AudioMasteringService);

    let ffmpegPath = path.join(process.cwd(), 'bin', 'ffmpeg.exe');
    if (!fs.existsSync(ffmpegPath)) {
      ffmpegPath = path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe');
    }
    if (!fs.existsSync(ffmpegPath)) {
      ffmpegPath = 'ffmpeg';
    }

    // ----------------------------------------------------
    // STEP 1: Generate Real English Narration Voice (Phase 6)
    // ----------------------------------------------------
    console.log('🎙️ STEP 1: Generating Real English Narration Audio (Phase 6 Edge Neural)...');
    const enText = 'Welcome to Uplora Content Engine Phase 7. Automated multi-track audio mastering with voice ducking is active.';
    const enVoiceResult = await voiceService.generateVoice({
      text: enText,
      voiceId: 'en-US-JennyNeural',
      language: 'en-US',
    });
    console.log(`   ✅ English Voice Generated: ${enVoiceResult.output.sizeBytes} bytes, duration: ${enVoiceResult.output.durationSeconds}s`);

    // ----------------------------------------------------
    // STEP 2: Multi-Track Audio Mastering with Ducking & Normalization
    // ----------------------------------------------------
    console.log('\n🎵 STEP 2: Running Phase 7 Multi-Track Audio Mastering & FFmpeg Ducking...');
    const enMasteredResult = await masteringService.masterAudioTrack({
      voiceBuffer: enVoiceResult.output.audioBuffer,
      musicCategory: 'corporate',
      sfxCues: [
        { sfxId: 'whoosh', timestampSeconds: 0.5, volume: 0.4 },
        { sfxId: 'chime', timestampSeconds: 2.0, volume: 0.3 },
      ],
      loudnessProfile: 'REELS', // -16 LUFS
      duckingThreshold: 0.08,
      duckingRatio: 6,
      workspaceId: 'ws_real_phase7',
      projectId: 'proj_real_phase7',
    });

    console.log(`   ✅ Mastered Audio Track Created:`);
    console.log(`      • Size: ${enMasteredResult.output.sizeBytes} bytes`);
    console.log(`      • Duration: ${enMasteredResult.output.durationSeconds}s`);
    console.log(`      • Target Loudness: ${enMasteredResult.output.integratedLufs} LUFS`);
    console.log(`      • True Peak: ${enMasteredResult.output.truePeakDb} dBFS`);
    console.log(`      • MediaAsset ID: ${enMasteredResult.asset?.id}`);
    console.log(`      • MediaAsset Status: ${enMasteredResult.asset?.status}`);
    console.log(`      • QC Silence Detected: ${enMasteredResult.output.qcReport.hasSilence}`);
    console.log(`      • QC Clipping Detected: ${enMasteredResult.output.qcReport.hasClipping}`);
    console.log(`      • QC Valid: ${enMasteredResult.output.qcReport.isValid}`);

    const masteredAudioPath = path.join(scratchDir, 'real_phase7_mastered_audio_en.wav');
    fs.writeFileSync(masteredAudioPath, enMasteredResult.output.masteredBuffer);

    // ----------------------------------------------------
    // STEP 3: Mux Mastered Audio with 9:16 Video Reel
    // ----------------------------------------------------
    console.log('\n🎬 STEP 3: Muxing Mastered Audio with 9:16 Video Reel...');
    
    const candidateVideoPaths = [
      path.join(process.cwd(), '..', '..', 'scratch', 'real_phase6_final_en.mp4'),
      path.join(process.cwd(), '..', 'scratch', 'real_phase6_final_en.mp4'),
      path.join(process.cwd(), 'scratch', 'real_phase6_final_en.mp4'),
      'd:/Content Creation Engine/scratch/real_phase6_final_en.mp4',
    ];

    let inputVideoPath = '';
    for (const p of candidateVideoPaths) {
      if (fs.existsSync(p)) {
        inputVideoPath = p;
        break;
      }
    }

    if (!inputVideoPath) {
      throw new Error(`Input 9:16 video reel not found across candidate paths`);
    }

    const finalMp4Path = path.join(scratchDir, 'real_phase7_final_mastered_en.mp4');

    const muxArgs = [
      '-i',
      inputVideoPath,
      '-i',
      masteredAudioPath,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      '-y',
      finalMp4Path,
    ];

    await execFileAsync(ffmpegPath, muxArgs);

    if (!fs.existsSync(finalMp4Path)) {
      throw new Error(`Final Phase 7 MP4 reel file creation failed at ${finalMp4Path}`);
    }

    const finalMp4Stat = fs.statSync(finalMp4Path);
    console.log(`   ✅ Real Final 9:16 Mastered Video Reel Generated: ${finalMp4Path} (${finalMp4Stat.size} bytes)`);

    // ----------------------------------------------------
    // STEP 4: FFprobe Probing & Verification
    // ----------------------------------------------------
    console.log('\n🔍 STEP 4: Probing Final MP4 Reel with FFprobe...');
    let ffprobePath = path.join(process.cwd(), 'bin', 'ffprobe.exe');
    if (!fs.existsSync(ffprobePath)) {
      ffprobePath = path.join(process.cwd(), 'apps', 'api', 'bin', 'ffprobe.exe');
    }
    if (!fs.existsSync(ffprobePath)) {
      ffprobePath = 'ffprobe';
    }

    const { stdout: probeStdout } = await execFileAsync(ffprobePath, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      finalMp4Path,
    ]);

    const probeData = JSON.parse(probeStdout);
    const videoStream = probeData.streams.find((s: any) => s.codec_type === 'video');
    const audioStream = probeData.streams.find((s: any) => s.codec_type === 'audio');

    console.log(`   • Format: ${probeData.format.format_name}`);
    console.log(`   • Duration: ${probeData.format.duration} seconds`);
    console.log(`   • Video Codec: ${videoStream?.codec_name} (${videoStream?.width}x${videoStream?.height})`);
    console.log(`   • Audio Codec: ${audioStream?.codec_name} (${audioStream?.sample_rate} Hz, ${audioStream?.channels} ch)`);

    if (
      !videoStream ||
      videoStream.codec_name !== 'h264' ||
      videoStream.width !== 768 ||
      videoStream.height !== 1344
    ) {
      throw new Error('FFprobe verification failed: Invalid video stream properties');
    }

    if (!audioStream || audioStream.codec_name !== 'aac') {
      throw new Error('FFprobe verification failed: Invalid audio stream properties');
    }

    // ----------------------------------------------------
    // STEP 5: Generate Real Tamil Narration Mastered Video (Phase 6 + Phase 7)
    // ----------------------------------------------------
    console.log('\n🇮🇳 STEP 5: Generating Tamil Narration Mastered Reel (ta-IN-PallaviNeural)...');
    const taText = 'உப்லோரா உள்ளடக்க உருவாக்க இயந்திரம் கட்டம் 7 வெற்றிகரமாக இயங்குகிறது.';
    const taVoiceResult = await voiceService.generateVoice({
      text: taText,
      voiceId: 'ta-IN-PallaviNeural',
      language: 'ta-IN',
    });

    const taMasteredResult = await masteringService.masterAudioTrack({
      voiceBuffer: taVoiceResult.output.audioBuffer,
      musicCategory: 'ambient',
      sfxCues: [{ sfxId: 'chime', timestampSeconds: 0.5, volume: 0.3 }],
      loudnessProfile: 'REELS',
      workspaceId: 'ws_real_phase7',
      projectId: 'proj_real_phase7',
    });

    const taMasteredAudioPath = path.join(scratchDir, 'real_phase7_mastered_audio_ta.wav');
    fs.writeFileSync(taMasteredAudioPath, taMasteredResult.output.masteredBuffer);

    const taFinalMp4Path = path.join(scratchDir, 'real_phase7_final_mastered_ta.mp4');
    await execFileAsync(ffmpegPath, [
      '-i',
      inputVideoPath,
      '-i',
      taMasteredAudioPath,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      '-y',
      taFinalMp4Path,
    ]);

    const taMp4Stat = fs.statSync(taFinalMp4Path);
    console.log(`   ✅ Real Tamil Mastered 9:16 Video Reel Generated: ${taFinalMp4Path} (${taMp4Stat.size} bytes)`);

    console.log('\n======================================================');
    console.log('🎉 PHASE 7 REAL SYSTEM VERIFICATION PASSED 100%!');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error(`\n❌ PHASE 7 VERIFICATION FAILURE: ${err.message}\n`, err.stack);
    process.exit(1);
  } finally {
    await module.close();
  }
}

runRealPhase7Verification();
