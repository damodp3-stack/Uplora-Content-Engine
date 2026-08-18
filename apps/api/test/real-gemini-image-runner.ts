import * as dotenv from "dotenv";
import * as path from "path";

// Load .env files from current working directory and apps/api/.env
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), "apps", "api", ".env") });

import { ConfigService } from "@nestjs/config";
import { GeminiImageProvider } from "../src/modules/image-generation/providers/gemini-image.provider";
import { ImagePromptBuilderService } from "../src/modules/image-generation/image-prompt-builder.service";
import { ImageQualityValidatorService } from "../src/modules/image-generation/image-quality-validator.service";
import { LocalStorageProvider } from "../src/modules/media/providers/local-storage.provider";
import { MediaService } from "../src/modules/media/media.service";
import { AssetType } from "../src/modules/media/entities/media-asset.entity";

async function executeRealGeminiImageRunner() {
  console.log("=================================================================");
  console.log("🎬 RUNNING DEDICATED REAL GEMINI IMAGE GENERATION RUNNER");
  console.log("=================================================================\n");

  const geminiKey = process.env.GEMINI_API_KEY || process.env.ai_geminiApiKey;

  const configService = new ConfigService({
    GEMINI_API_KEY: geminiKey,
    GEMINI_IMAGE_MODEL: "gemini-3.1-flash-image",
    STORAGE_PROVIDER: "local",
    STORAGE_LOCAL_DIR: path.join(process.cwd(), "uploads"),
  });

  const geminiProvider = new GeminiImageProvider(configService);
  const promptBuilder = new ImagePromptBuilderService();
  const qualityValidator = new ImageQualityValidatorService();
  const storageProvider = new LocalStorageProvider(configService);

  const status = await geminiProvider.getStatus();
  console.log(`Gemini Image Provider Health Status: [${status.status}]`);

  if (status.status === "UNAVAILABLE") {
    console.log(`⚠️ GEMINI_API_KEY not configured. Provider Status = UNAVAILABLE.\n`);
    console.log(JSON.stringify([{ shotNumber: 1, status: "UNAVAILABLE", reason: status.message }], null, 2));
    return;
  }

  // Mock repository for MediaAsset
  const savedAssets: any[] = [];
  const mockAssetRepo: any = {
    create: (dto: any) => ({ id: `gemini-asset-${Date.now()}-${Math.random()}`, createdAt: new Date(), updatedAt: new Date(), ...dto }),
    save: async (asset: any) => {
      const idx = savedAssets.findIndex((a) => a.id === asset.id);
      if (idx >= 0) savedAssets[idx] = { ...savedAssets[idx], ...asset };
      else savedAssets.push(asset);
      return asset;
    },
    findOne: async ({ where }: any) => savedAssets.find((a) => a.id === where.id) || null,
    find: async ({ where }: any) => savedAssets.filter((a) => a.workspaceId === where.workspaceId),
  };

  const mediaService = new MediaService(mockAssetRepo, storageProvider);

  const targetShots = [
    { shotNumber: 1, visualDescription: "Sleek industrial plant skyline with glowing cyan volumetric lights", cameraAngle: "low_angle" },
    { shotNumber: 2, visualDescription: "Executive looking at slow loading website on desktop monitor", cameraAngle: "eye_level" },
    { shotNumber: 3, visualDescription: "Futuristic Uplora digital analytics portal UI glowing on smartphone", cameraAngle: "high_angle" },
  ];

  const results: any[] = [];
  const startTimeTotal = Date.now();

  for (const shot of targetShots) {
    console.log(`--> Requesting Gemini Shot ${shot.shotNumber}: "${shot.visualDescription.substring(0, 60)}..."`);
    const shotStartTime = Date.now();

    try {
      const promptOptions = promptBuilder.buildPrompt({
        shot,
        visualBible: {
          artDirection: "Cinematic Industrial Tech",
          colorPalette: { primaryHex: "#0F172A", secondaryHex: "#3B82F6", accentHex: "#10B981" },
          lighting: "Dramatic cyan volumetric rim lighting",
          lensStyle: "35mm prime f/1.8",
        },
        characterIdentity: {
          characterId: "char-1",
          appearance: { ageRange: "30-35", gender: "male", clothing: "Navy blazer" },
        },
      });

      // 1. Direct call to GeminiImageProvider (gemini-3.1-flash-image)
      const output = await geminiProvider.generateImage(promptOptions);

      // 2. Image QC Validation
      const validation = qualityValidator.validateImage(output.buffer, output.mimeType, output.width, output.height);

      // 3. MediaService storage upload
      const filename = `shot_${shot.shotNumber}_gemini_keyframe_${Date.now()}.${validation.mimeType.split("/")[1] || "jpeg"}`;
      const uploadedAsset = await mediaService.uploadAndSaveAsset(
        "ws-gemini-runner",
        "proj-gemini-runner",
        AssetType.IMAGE,
        filename,
        output.buffer,
        validation.mimeType,
        `shot-${shot.shotNumber}`,
      );

      // 4. Physical storage existence check
      const finalAsset = await mediaService.markAssetAvailable(uploadedAsset.id, "ws-gemini-runner", {
        size: validation.size,
        checksum: validation.checksum,
        width: validation.width,
        height: validation.height,
      });

      const physicalExists = await storageProvider.exists(finalAsset.storageKey);

      results.push({
        shotNumber: shot.shotNumber,
        status: "SUCCESS",
        provider: output.provider,
        model: output.model,
        latencyMs: Date.now() - shotStartTime,
        mimeType: validation.mimeType,
        dimensions: `${output.width}x${output.height}`,
        fileSize: `${validation.size} bytes`,
        checksumSHA256: validation.checksum,
        storageKey: finalAsset.storageKey,
        physicalStorageVerified: physicalExists,
        mediaAssetStatus: finalAsset.status,
        mediaAssetId: finalAsset.id,
        costUSD: output.estimatedCostUSD,
      });

      console.log(`✅ Shot ${shot.shotNumber} keyframe generated & verified via Gemini!`);
    } catch (err: any) {
      console.error(`❌ Shot ${shot.shotNumber} Gemini generation failed: ${err.message}`);
      results.push({
        shotNumber: shot.shotNumber,
        status: "FAILED",
        reason: err.message,
      });
    }
  }

  const totalTimeMs = Date.now() - startTimeTotal;

  console.log("\n=================================================================");
  console.log(`📊 REAL GEMINI IMAGE GENERATION REPORT (Total Time: ${totalTimeMs}ms)`);
  console.log("=================================================================");
  console.log(JSON.stringify(results, null, 2));
}

executeRealGeminiImageRunner().catch((err) => {
  console.error("Fatal runner error:", err);
});
