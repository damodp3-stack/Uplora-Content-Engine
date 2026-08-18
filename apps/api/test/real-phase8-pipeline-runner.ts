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
import { PipelineQcService } from '../src/modules/pipeline-qc/services/pipeline-qc.service';
import { SelfHealingOrchestratorService } from '../src/modules/pipeline-qc/services/self-healing.orchestrator';
import { StorageHygieneService } from '../src/modules/pipeline-qc/services/storage-hygiene.service';
import { MediaService } from '../src/modules/media/media.service';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execFileAsync = promisify(execFile);

async function runRealPhase8EndToEndVerification() {
  console.log('\n========================================================================');
  console.log('🚀 UPLORA CONTENT ENGINE — PHASE 8 REAL END-TO-END PIPELINE RUNNER');
  console.log('   Full Pipeline QC, Dual-Gate Scoring, Self-Healing & Production Lock');
  console.log('========================================================================\n');

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
      id: `asset_phase8_${Date.now()}`,
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
      PipelineQcService,
      SelfHealingOrchestratorService,
      StorageHygieneService,
      { provide: MediaService, useValue: mockMediaService },
    ],
  }).compile();

  try {
    const voiceService = module.get(VoiceGenerationService);
    const masteringService = module.get(AudioMasteringService);
    const pipelineQc = module.get(PipelineQcService);
    const selfHealing = module.get(SelfHealingOrchestratorService);
    const storageHygiene = module.get(StorageHygieneService);

    let ffmpegPath = path.join(process.cwd(), 'bin', 'ffmpeg.exe');
    if (!fs.existsSync(ffmpegPath)) ffmpegPath = path.join(process.cwd(), 'apps', 'api', 'bin', 'ffmpeg.exe');
    if (!fs.existsSync(ffmpegPath)) ffmpegPath = 'ffmpeg';

    let ffprobePath = path.join(process.cwd(), 'bin', 'ffprobe.exe');
    if (!fs.existsSync(ffprobePath)) ffprobePath = path.join(process.cwd(), 'apps', 'api', 'bin', 'ffprobe.exe');
    if (!fs.existsSync(ffprobePath)) ffprobePath = 'ffprobe';

    // ----------------------------------------------------
    // STEP 1: Execute Real English Pipeline Verification
    // ----------------------------------------------------
    console.log('🎙️ STEP 1: Generating Real English Narration (en-US-JennyNeural)...');
    const enText =
      'Welcome to Uplora Content Engine Phase 8. Multi-track audio mastering, frame-lock A/V synchronization, and dual-gate quality control are active.';
    
    const enVoiceResult = await voiceService.generateVoice({
      text: enText,
      voiceId: 'en-US-JennyNeural',
      language: 'en-US',
    });
    console.log(`   ✅ English Voice Generated: ${enVoiceResult.output.sizeBytes} bytes, duration: ${enVoiceResult.output.durationSeconds}s`);

    console.log('\n🎵 STEP 2: Executing Multi-Track Audio Mastering & Dynamic Ducking...');
    const enMasteredResult = await masteringService.masterAudioTrack({
      voiceBuffer: enVoiceResult.output.audioBuffer,
      musicCategory: 'corporate',
      sfxCues: [
        { sfxId: 'whoosh', timestampSeconds: 0.5, volume: 0.4 },
        { sfxId: 'chime', timestampSeconds: 3.0, volume: 0.3 },
      ],
      loudnessProfile: 'REELS', // -16 LUFS
      workspaceId: 'ws_phase8_en',
      projectId: 'proj_phase8_en',
    });

    const masteredEnAudioPath = path.join(scratchDir, 'real_phase8_mastered_en.wav');
    fs.writeFileSync(masteredEnAudioPath, enMasteredResult.output.masteredBuffer);
    console.log(`   ✅ English Mastered Audio Saved: ${masteredEnAudioPath} (${enMasteredResult.output.sizeBytes} bytes)`);

    console.log('\n🎬 STEP 3: Muxing Mastered Audio with 9:16 Keyframe Video Reel...');
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
      throw new Error('Input 9:16 video reel template not found');
    }

    const finalEnMp4Path = path.join(scratchDir, 'real_phase8_final_30s_en.mp4');
    await execFileAsync(ffmpegPath, [
      '-i',
      inputVideoPath,
      '-i',
      masteredEnAudioPath,
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
      finalEnMp4Path,
    ]);

    const finalEnStat = fs.statSync(finalEnMp4Path);
    console.log(`   ✅ Real English 9:16 Final Mastered Reel Generated: ${finalEnMp4Path} (${finalEnStat.size} bytes)`);

    // ----------------------------------------------------
    // STEP 4: Phase 8 Dual-Gate Quality Control Inspection (English)
    // ----------------------------------------------------
    console.log('\n🔍 STEP 4: Running Phase 8 Dual-Gate Quality Inspection (English)...');
    let enQcResult = await pipelineQc.evaluatePipeline(finalEnMp4Path, enVoiceResult.output.durationSeconds);

    console.log(`   • Overall Quality Score: ${enQcResult.overallScore} / 100`);
    console.log(`   • Critical Gates Passed: ${enQcResult.criticalGatesPassed}`);
    console.log(`   • A/V Sync Delta: ${enQcResult.criticalReport.avSyncDeltaMs} ms (Limit: <= 50ms)`);
    console.log(`   • Video Resolution: ${enQcResult.criticalReport.videoWidth}x${enQcResult.criticalReport.videoHeight} (9:16)`);
    console.log(`   • Audio Codec: ${enQcResult.criticalReport.audioCodec}`);
    console.log(`   • Digital Audio Clipping: ${enQcResult.criticalReport.hasAudioClipping}`);
    console.log(`   • Production Ready: ${enQcResult.isProductionReady}`);

    if (!enQcResult.passed) {
      console.log('\n🔄 Triggering Self-Healing Orchestration...');
      const healingResponse = await selfHealing.orchestrateSelfHealing(
        {
          jobId: 'job_real_phase8_en',
          workspaceId: 'ws_phase8_en',
          projectId: 'proj_phase8_en',
          prompt: enText,
          language: 'en-US',
          targetDurationSeconds: enVoiceResult.output.durationSeconds,
          currentAttempt: 1,
          maxAttempts: 3,
          stageHistory: [],
        },
        finalEnMp4Path,
        enText,
        enQcResult,
      );
      enQcResult = healingResponse.finalQcResult;
    }

    if (!enQcResult.passed) {
      throw new Error('English reel failed Phase 8 Quality Gate');
    }

    // ----------------------------------------------------
    // STEP 5: Execute Real Tamil Pipeline Verification (ta-IN-PallaviNeural)
    // ----------------------------------------------------
    console.log('\n🇮🇳 STEP 5: Generating Real Tamil Narration (ta-IN-PallaviNeural)...');
    const taText = 'உப்லோரா உள்ளடக்க உருவாக்க இயங்குதளம் கட்டம் 8 தரக்கட்டுப்பாடு மற்றும் சுய நிவர்த்தி அமைப்பை வெற்றிகரமாக செயல்படுத்துகிறது.';

    const taVoiceResult = await voiceService.generateVoice({
      text: taText,
      voiceId: 'ta-IN-PallaviNeural',
      language: 'ta-IN',
    });
    console.log(`   ✅ Tamil Voice Generated: ${taVoiceResult.output.sizeBytes} bytes, duration: ${taVoiceResult.output.durationSeconds}s`);

    const taMasteredResult = await masteringService.masterAudioTrack({
      voiceBuffer: taVoiceResult.output.audioBuffer,
      musicCategory: 'ambient',
      sfxCues: [{ sfxId: 'chime', timestampSeconds: 1.0, volume: 0.3 }],
      loudnessProfile: 'REELS',
      workspaceId: 'ws_phase8_ta',
      projectId: 'proj_phase8_ta',
    });

    const masteredTaAudioPath = path.join(scratchDir, 'real_phase8_mastered_ta.wav');
    fs.writeFileSync(masteredTaAudioPath, taMasteredResult.output.masteredBuffer);

    const finalTaMp4Path = path.join(scratchDir, 'real_phase8_final_30s_ta.mp4');
    await execFileAsync(ffmpegPath, [
      '-i',
      inputVideoPath,
      '-i',
      masteredTaAudioPath,
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
      finalTaMp4Path,
    ]);

    const finalTaStat = fs.statSync(finalTaMp4Path);
    console.log(`   ✅ Real Tamil 9:16 Final Mastered Reel Generated: ${finalTaMp4Path} (${finalTaStat.size} bytes)`);

    console.log('\n🔍 STEP 6: Running Phase 8 Dual-Gate Quality Inspection (Tamil)...');
    let taQcResult = await pipelineQc.evaluatePipeline(finalTaMp4Path, taVoiceResult.output.durationSeconds);
    console.log(`   • Tamil Quality Score: ${taQcResult.overallScore} / 100`);
    console.log(`   • Tamil Critical Gates Passed: ${taQcResult.criticalGatesPassed}`);
    console.log(`   • Tamil Production Ready: ${taQcResult.isProductionReady}`);

    if (!taQcResult.passed) {
      throw new Error('Tamil reel failed Phase 8 Quality Gate');
    }

    // ----------------------------------------------------
    // STEP 7: Run Storage Hygiene Cleanup
    // ----------------------------------------------------
    console.log('\n🧹 STEP 7: Executing Storage Hygiene Cleanup...');
    const hygieneResult = storageHygiene.cleanupTransientScratchFiles('dummy_old_job');
    console.log(`   ✅ Storage Hygiene Completed: ${hygieneResult.filesRemoved} files purged`);

    console.log('\n========================================================================');
    console.log('🎉 PHASE 8 REAL END-TO-END PIPELINE VERIFICATION PASSED 100%!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error(`\n❌ PHASE 8 VERIFICATION FAILURE: ${err.message}\n`, err.stack);
    process.exit(1);
  } finally {
    await module.close();
  }
}

runRealPhase8EndToEndVerification();
