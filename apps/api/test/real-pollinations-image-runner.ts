import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();
dotenv.config({ path: path.join(process.cwd(), "apps", "api", ".env") });

import { ConfigService } from "@nestjs/config";
import { ImageGenerationService } from "../src/modules/image-generation/image-generation.service";
import { ImagePromptBuilderService } from "../src/modules/image-generation/image-prompt-builder.service";
import { ImageQualityValidatorService } from "../src/modules/image-generation/image-quality-validator.service";
import { GeminiImageProvider } from "../src/modules/image-generation/providers/gemini-image.provider";
import { FalImageProvider } from "../src/modules/image-generation/providers/fal-image.provider";
import { OpenAIImageProvider } from "../src/modules/image-generation/providers/openai-image.provider";
import { PollinationsImageProvider } from "../src/modules/image-generation/providers/pollinations-image.provider";
import { MediaService } from "../src/modules/media/media.service";
import { LocalStorageProvider } from "../src/modules/media/providers/local-storage.provider";

async function executeRealPollinationsImageRunner() {
  console.log("=================================================================");
  console.log("🌸 RUNNING REAL POLLINATIONS 3-SHOT IMAGE GENERATION VERIFICATION");
  console.log("=================================================================\n");

  const scratchUploadsDir = path.join(process.cwd(), "uploads", "pollinations-runner");

  const mockConfigService = {
    get: (key: string) => {
      if (key === "IMAGE_GENERATION_PROVIDER") return "pollinations";
      if (key === "POLLINATIONS_MODEL") return "flux";
      if (key === "STORAGE_PROVIDER") return "local";
      if (key === "STORAGE_LOCAL_DIR") return scratchUploadsDir;
      return process.env[key] || null;
    },
  } as any;

  const promptBuilder = new ImagePromptBuilderService();
  const qualityValidator = new ImageQualityValidatorService();
  const pollinationsProvider = new PollinationsImageProvider(mockConfigService);
  const geminiProvider = new GeminiImageProvider(mockConfigService);
  const falProvider = new FalImageProvider(mockConfigService);
  const openaiProvider = new OpenAIImageProvider(mockConfigService);
  const localStorageProvider = new LocalStorageProvider(mockConfigService);

  const savedAssets: any[] = [];
  const mockAssetRepo: any = {
    create: (dto: any) => ({
      id: `asset-pollinations-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...dto,
    }),
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

  const emittedEvents: Array<{ event: string; payload: any }> = [];
  const mockGateway: any = {
    server: {
      to: () => ({
        emit: (event: string, payload: any) => {
          emittedEvents.push({ event, payload });
        },
      }),
    },
  };

  const imageService = new ImageGenerationService(
    mockConfigService,
    promptBuilder,
    qualityValidator,
    geminiProvider,
    falProvider,
    openaiProvider,
    pollinationsProvider,
    mediaService,
    mockGateway,
  );

  const activeProvider = await imageService.getActiveProvider();
  const status = await activeProvider.getStatus();

  console.log(`Active Provider: [${activeProvider.name}] (Status: ${status.status})`);
  if (activeProvider.name !== "pollinations") {
    throw new Error(`Expected pollinations provider, got [${activeProvider.name}]`);
  }

  const targetShots = [
    {
      shotNumber: 1,
      visualDescription: "Modern automated CNC milling machine in high-precision aerospace manufacturing facility with engineers operating digital controls",
      cameraAngle: "low_angle",
      subjectAction: "CNC spindle carves titanium component with cooling fluid spray",
    },
    {
      shotNumber: 2,
      visualDescription: "Executive B2B industrial decision maker reviewing real-time web portal analytics on desktop workstation monitor in sleek corporate office",
      cameraAngle: "eye_level",
      subjectAction: "Executive points at conversion growth chart on website UI",
    },
    {
      shotNumber: 3,
      visualDescription: "Futuristic Uplora digital industrial lead generation portal glowing on mobile screen with modern factory floor background in soft bokeh",
      cameraAngle: "high_angle",
      subjectAction: "Smartphone screen displays 24/7 client inquiry notification",
    },
  ];

  const results: any[] = [];
  let totalLatencyMs = 0;
  let retriesCount = 0;

  for (const shot of targetShots) {
    console.log(`\n-----------------------------------------------------------------`);
    console.log(`🎬 Generating Shot ${shot.shotNumber}: "${shot.visualDescription.substring(0, 70)}..."`);
    console.log(`-----------------------------------------------------------------`);

    const startTime = Date.now();
    try {
      const res = await imageService.generateKeyframeForShot({
        workspaceId: "ws-pollinations-verification",
        projectId: "proj-pollinations-verification",
        shotId: `shot-${shot.shotNumber}`,
        shotPromptInput: {
          shot,
          visualBible: {
            visualStyle: "Realistic B2B corporate industrial photography",
            colorPalette: { primaryHex: "#0F172A", accentHex: "#3B82F6" },
            lighting: "Volumetric cinematic studio lighting",
            negativePrompts: "no text, no watermark, no logo, blurry",
          },
          characterIdentity: {
            characterId: "char-exec-1",
            appearance: { clothing: "Dark charcoal blazer", hairStyleColor: "Short neat dark hair" },
          },
        },
      });

      const shotLatency = Date.now() - startTime;
      totalLatencyMs += shotLatency;
      if (res.output.retryCount) {
        retriesCount += res.output.retryCount;
      }

      const physicalExists = await localStorageProvider.exists(res.asset.storageKey);

      const shotResult = {
        shotNumber: shot.shotNumber,
        httpStatus: "200 OK",
        latencyMs: res.output.latencyMs,
        mimeType: res.output.mimeType,
        dimensions: `${res.output.width}x${res.output.height}`,
        fileSize: `${res.asset.size} bytes`,
        bytes: res.asset.size,
        sha256: res.asset.checksum,
        storageKey: res.asset.storageKey,
        mediaAssetId: res.asset.id,
        physicalExistence: physicalExists,
        finalAssetStatus: res.asset.status,
      };

      results.push(shotResult);
      console.log(`✅ Shot ${shot.shotNumber} Verification Output:`);
      console.log(JSON.stringify(shotResult, null, 2));

      // 4-second delay between sequential requests for rate-limit protection
      if (shot.shotNumber < 3) {
        console.log("Waiting 4s before next sequential request...");
        await new Promise((r) => setTimeout(r, 4000));
      }
    } catch (err: any) {
      console.error(`❌ Shot ${shot.shotNumber} Failed: ${err.message}`);
      results.push({
        shotNumber: shot.shotNumber,
        httpStatus: "FAILED",
        error: err.message,
        finalAssetStatus: "FAILED",
      });
    }
  }

  const avgLatencyMs = Math.round(totalLatencyMs / targetShots.length);

  console.log("\n=================================================================");
  console.log("📊 POLLINATIONS 3-SHOT VERIFICATION SUMMARY REPORT");
  console.log("=================================================================");
  console.log(`Total Shots: ${results.length}`);
  console.log(`Success Count: ${results.filter((r) => r.finalAssetStatus === "AVAILABLE").length}`);
  console.log(`Average Latency: ${avgLatencyMs} ms`);
  console.log(`Total Execution Latency: ${totalLatencyMs} ms`);
  console.log(`Total Retries: ${retriesCount}`);
  console.log(`Emitted Realtime Events: ${emittedEvents.length}`);
  console.log(JSON.stringify(results, null, 2));

  return { results, avgLatencyMs, totalLatencyMs, retriesCount, emittedEventsCount: emittedEvents.length };
}

executeRealPollinationsImageRunner().catch((err) => {
  console.error("Fatal runner error:", err);
  process.exit(1);
});
