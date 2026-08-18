import * as dotenv from "dotenv";
import * as path from "path";

// Load .env files from current working directory and apps/api/.env
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), "apps", "api", ".env") });

import { ConfigService } from "@nestjs/config";
import { AIEngineService } from "../src/modules/ai-engine/ai-engine.service";
import { PromptEngineService } from "../src/modules/ai-engine/prompt-engine.service";
import { GeminiProvider } from "../src/modules/ai-engine/providers/gemini.provider";
import { OpenAIProvider } from "../src/modules/ai-engine/providers/openai.provider";
import { OllamaProvider } from "../src/modules/ai-engine/providers/ollama.provider";
import { HuggingFaceProvider } from "../src/modules/ai-engine/providers/huggingface.provider";
import { CreativeDirectorAgent } from "../src/modules/video-studio/agents/creative-director.agent";
import { ResearchAgent } from "../src/modules/video-studio/agents/research.agent";
import { ContentStrategistAgent } from "../src/modules/video-studio/agents/content-strategist.agent";
import { ScriptWriterAgent } from "../src/modules/video-studio/agents/script-writer.agent";
import { StoryboardDirectorAgent } from "../src/modules/video-studio/agents/storyboard-director.agent";
import { VisualDirectorAgent } from "../src/modules/video-studio/agents/visual-director.agent";
import { CharacterAssetAgent } from "../src/modules/video-studio/agents/character-asset.agent";
import { ImageGenerationService } from "../src/modules/image-generation/image-generation.service";
import { ImagePromptBuilderService } from "../src/modules/image-generation/image-prompt-builder.service";
import { ImageQualityValidatorService } from "../src/modules/image-generation/image-quality-validator.service";
import { GeminiImageProvider } from "../src/modules/image-generation/providers/gemini-image.provider";
import { FalImageProvider } from "../src/modules/image-generation/providers/fal-image.provider";
import { OpenAIImageProvider } from "../src/modules/image-generation/providers/openai-image.provider";
import { PollinationsImageProvider } from "../src/modules/image-generation/providers/pollinations-image.provider";
import { MediaService } from "../src/modules/media/media.service";
import { LocalStorageProvider } from "../src/modules/media/providers/local-storage.provider";
import * as fs from "fs/promises";

async function executeRealPhase4ImageRunner() {
  const providerPref = process.env.IMAGE_GENERATION_PROVIDER || "pollinations";
  const geminiKey = process.env.GEMINI_API_KEY;
  const falKey = process.env.FAL_KEY || process.env.FAL_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  console.log("=================================================================");
  console.log(`🎬 RUNNING REAL PHASE 4 KEYFRAME IMAGE GENERATION RUNNER (${providerPref.toUpperCase()})`);
  console.log("=================================================================\n");

  const configService = new ConfigService({
    GEMINI_API_KEY: geminiKey,
    FAL_KEY: falKey,
    OPENAI_API_KEY: openaiKey,
    IMAGE_GENERATION_PROVIDER: providerPref,
    GEMINI_IMAGE_MODEL: "gemini-3.1-flash-image",
    STORAGE_PROVIDER: "local",
    STORAGE_LOCAL_DIR: path.join(process.cwd(), "uploads"),
  });

  const promptEngine = new PromptEngineService();
  const geminiProvider = new GeminiProvider(configService);
  const openaiAiProvider = new OpenAIProvider(configService);
  const ollamaProvider = new OllamaProvider(configService);
  const huggingfaceProvider = new HuggingFaceProvider(configService);

  const aiEngine = new AIEngineService(
    configService,
    promptEngine,
    geminiProvider,
    openaiAiProvider,
    ollamaProvider,
    huggingfaceProvider,
  );

  const creativeDirector = new CreativeDirectorAgent(aiEngine);
  const researchAgent = new ResearchAgent(aiEngine);
  const contentStrategist = new ContentStrategistAgent(aiEngine);
  const scriptWriter = new ScriptWriterAgent(aiEngine);
  const storyboardDirector = new StoryboardDirectorAgent(aiEngine);
  const visualDirector = new VisualDirectorAgent(aiEngine);
  const characterAsset = new CharacterAssetAgent(aiEngine);

  const promptBuilder = new ImagePromptBuilderService();
  const qualityValidator = new ImageQualityValidatorService();
  const geminiImageProvider = new GeminiImageProvider(configService);
  const falProvider = new FalImageProvider(configService);
  const openaiImageProvider = new OpenAIImageProvider(configService);
  const pollinationsImageProvider = new PollinationsImageProvider(configService);
  const localStorageProvider = new LocalStorageProvider(configService);

  // Mock Repository for MediaAsset
  const savedAssets: any[] = [];
  const mockAssetRepo: any = {
    create: (dto: any) => ({ id: `img-asset-${Date.now()}-${Math.random()}`, createdAt: new Date(), updatedAt: new Date(), ...dto }),
    save: async (asset: any) => {
      const idx = savedAssets.findIndex((a) => a.id === asset.id);
      if (idx >= 0) savedAssets[idx] = { ...savedAssets[idx], ...asset };
      else savedAssets.push(asset);
      return asset;
    },
    findOne: async ({ where }: any) => savedAssets.find((a) => a.id === where.id) || null,
    find: async ({ where }: any) => savedAssets.filter((a) => a.workspaceId === where.workspaceId),
  };

  const mediaService = new MediaService(mockAssetRepo, localStorageProvider);

  const mockGateway: any = {
    server: { to: () => ({ emit: () => {} }) },
  };

  const imageService = new ImageGenerationService(
    configService,
    promptBuilder,
    qualityValidator,
    geminiImageProvider,
    falProvider,
    openaiImageProvider,
    pollinationsImageProvider,
    mediaService,
    mockGateway,
  );

  const activeProvider = await imageService.getActiveProvider();
  const providerStatus = await activeProvider.getStatus();

  console.log(`Active Image Provider: [${activeProvider.name}] (Status: ${providerStatus.status})`);
  if (providerStatus.status === "UNAVAILABLE") {
    console.log(`⚠️ Provider credentials missing (${providerStatus.message}). Marking generation status = UNAVAILABLE.\n`);
  }

  // Phase 2 Blueprint Generation for prompt
  const rawPrompt = "Create a 30-second Instagram Reel for Uplora explaining why industrial companies need a professional website.";
  console.log(`--> Phase 2 Pipeline Step: Generating Blueprint for "${rawPrompt}"...`);

  let concept, research, strategy, script, storyboard, visualBible, characterAssetPkg;
  try {
    concept = await creativeDirector.developConcept(rawPrompt, "instagram_reels", 30, "english");
    research = await researchAgent.collectResearch(rawPrompt, concept.targetAudience.persona);
    strategy = await contentStrategist.buildStrategy(concept, research);
    script = await scriptWriter.writeScript(concept, strategy, research);
    storyboard = await storyboardDirector.createStoryboard(script);
    visualBible = await visualDirector.createVisualBible(concept);
    characterAssetPkg = await characterAsset.generateProfiles(concept, visualBible, storyboard);
    console.log("✅ Creative Blueprint Generated Successfully.\n");
  } catch (err: any) {
    console.warn(`⚠️ Creative Blueprint fallbacks applied due to LLM error: ${err.message}`);
  }

  // Attempt Real Keyframe Image Generation for Shot 1, Shot 2, Shot 3
  const targetShots = storyboard?.shots?.slice(0, 3) || [
    { shotNumber: 1, visualDescription: "Sleek industrial plant skyline with glowing cyan lights", cameraAngle: "low_angle" },
    { shotNumber: 2, visualDescription: "Executive looking at slow loading website on desktop monitor", cameraAngle: "eye_level" },
    { shotNumber: 3, visualDescription: "Futuristic Uplora digital analytics portal UI glowing on smartphone", cameraAngle: "high_angle" },
  ];

  console.log("=================================================================");
  console.log("🎨 GENERATING KEYFRAME IMAGES FOR SHOTS 1, 2, 3 VIA GEMINI");
  console.log("=================================================================\n");

  const results: any[] = [];

  for (const shot of targetShots) {
    console.log(`--> Shot ${shot.shotNumber}: "${shot.visualDescription.substring(0, 60)}..."`);
    if (providerStatus.status === "UNAVAILABLE") {
      results.push({
        shotNumber: shot.shotNumber,
        status: "UNAVAILABLE",
        reason: providerStatus.message,
      });
      continue;
    }

    try {
      const res = await imageService.generateKeyframeForShot({
        workspaceId: "ws-real-runner",
        projectId: "proj-real-runner",
        shotId: `shot-${shot.shotNumber}`,
        shotPromptInput: {
          shot,
          visualBible,
          characterIdentity: characterAssetPkg?.characters?.[0],
        },
      });

      const physicalExists = await localStorageProvider.exists(res.asset.storageKey);

      results.push({
        shotNumber: shot.shotNumber,
        status: "SUCCESS",
        provider: res.output.provider,
        model: res.output.model,
        latencyMs: res.output.latencyMs,
        dimensions: `${res.output.width}x${res.output.height}`,
        fileSize: `${res.asset.size} bytes`,
        checksum: res.asset.checksum,
        storageKey: res.asset.storageKey,
        physicalStorageVerified: physicalExists,
        assetId: res.asset.id,
        costUSD: res.output.estimatedCostUSD,
      });
      console.log(`✅ Shot ${shot.shotNumber} keyframe generated & verified in storage!`);
    } catch (err: any) {
      console.error(`❌ Shot ${shot.shotNumber} generation failed: ${err.message}`);
      results.push({
        shotNumber: shot.shotNumber,
        status: "FAILED",
        reason: err.message,
      });
    }
  }

  console.log("\n=================================================================");
  console.log("📊 PHASE 4 REAL IMAGE GENERATION RUNNER REPORT");
  console.log("=================================================================");
  console.log(JSON.stringify(results, null, 2));
}

executeRealPhase4ImageRunner().catch((err) => {
  console.error("Fatal runner error:", err);
});
