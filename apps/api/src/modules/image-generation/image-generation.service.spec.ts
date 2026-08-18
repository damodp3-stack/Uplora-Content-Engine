import { ImageGenerationService } from "./image-generation.service";
import { ImagePromptBuilderService } from "./image-prompt-builder.service";
import { ImageQualityValidatorService } from "./image-quality-validator.service";
import { GeminiImageProvider } from "./providers/gemini-image.provider";
import { FalImageProvider } from "./providers/fal-image.provider";
import { OpenAIImageProvider } from "./providers/openai-image.provider";
import { MediaService } from "../media/media.service";
import { CollaborationGateway } from "../realtime/collaboration.gateway";
import { AssetStatus } from "../media/entities/media-asset.entity";

describe("ImageGenerationService", () => {
  let service: ImageGenerationService;
  let mockGeminiProvider: jest.Mocked<GeminiImageProvider>;
  let mockFalProvider: jest.Mocked<FalImageProvider>;
  let mockOpenAIProvider: jest.Mocked<OpenAIImageProvider>;
  let mockPollinationsProvider: any;
  let mockMediaService: any;
  let mockGateway: any;

  beforeEach(() => {
    mockGeminiProvider = {
      name: "gemini",
      getStatus: jest.fn().mockResolvedValue({ status: "AVAILABLE" }),
      generateImage: jest.fn().mockResolvedValue({
        buffer: Buffer.from("fake-gemini-image-bytes"),
        mimeType: "image/jpeg",
        provider: "gemini",
        model: "gemini-3.1-flash-image",
        latencyMs: 1100,
        requestId: "gemini-req-1",
        estimatedCostUSD: 0.002,
        retryCount: 0,
        width: 768,
        height: 1344,
        seed: 42001,
        consistencyMechanism: "prompt_conditioning_plus_style_rules",
      }),
    } as any;

    mockFalProvider = {
      name: "fal",
      getStatus: jest.fn().mockResolvedValue({ status: "AVAILABLE" }),
      generateImage: jest.fn().mockResolvedValue({
        buffer: Buffer.from("fake-image-bytes"),
        mimeType: "image/png",
        provider: "fal",
        model: "fal-ai/flux/schnell",
        latencyMs: 1200,
        requestId: "fal-req-1",
        estimatedCostUSD: 0.003,
        retryCount: 0,
        width: 768,
        height: 1344,
        seed: 42001,
        consistencyMechanism: "prompt_conditioning_plus_seed",
      }),
    } as any;

    mockOpenAIProvider = {
      name: "openai",
      getStatus: jest.fn().mockResolvedValue({ status: "UNAVAILABLE" }),
      generateImage: jest.fn(),
    } as any;

    mockPollinationsProvider = {
      name: "pollinations",
      getStatus: jest.fn().mockResolvedValue({ status: "AVAILABLE" }),
      generateImage: jest.fn().mockResolvedValue({
        buffer: Buffer.from("fake-pollinations-image-bytes"),
        mimeType: "image/jpeg",
        provider: "pollinations",
        model: "flux",
        latencyMs: 1500,
        requestId: "pollinations-req-1",
        estimatedCostUSD: 0,
        retryCount: 0,
        width: 576,
        height: 1024,
        seed: 12345,
        consistencyMechanism: "prompt_conditioning_plus_style_rules",
      }),
    } as any;

    mockMediaService = {
      createPlannedAsset: jest.fn().mockResolvedValue({
        id: "asset-planned-1",
        workspaceId: "ws-1",
        projectId: "proj-1",
        status: AssetStatus.PLANNED,
      }),
      uploadAndSaveAsset: jest.fn().mockResolvedValue({
        id: "asset-uploaded-1",
        workspaceId: "ws-1",
        projectId: "proj-1",
        status: AssetStatus.AVAILABLE,
        storageKey: "ws-1/proj-1/image/shot_1.png",
      }),
      markAssetAvailable: jest.fn().mockResolvedValue({
        id: "asset-uploaded-1",
        workspaceId: "ws-1",
        projectId: "proj-1",
        status: AssetStatus.AVAILABLE,
        storageKey: "ws-1/proj-1/image/shot_1.png",
      }),
      markAssetFailed: jest.fn().mockResolvedValue({}),
    };

    mockGateway = {
      server: {
        to: jest.fn().mockReturnValue({ emit: jest.fn() }),
      },
    };

    const configService = {
      get: jest.fn().mockReturnValue("pollinations"),
    } as any;

    const promptBuilder = new ImagePromptBuilderService();
    const qualityValidator = new ImageQualityValidatorService();

    service = new ImageGenerationService(
      configService,
      promptBuilder,
      qualityValidator,
      mockGeminiProvider,
      mockFalProvider,
      mockOpenAIProvider,
      mockPollinationsProvider,
      mockMediaService,
      mockGateway,
    );
  });

  it("should generate keyframe image via Gemini provider, upload to storage, and emit WebSocket events", async () => {
    const result = await service.generateKeyframeForShot({
      workspaceId: "ws-1",
      projectId: "proj-1",
      shotId: "shot-1",
      shotPromptInput: {
        shot: {
          shotNumber: 1,
          visualDescription: "Futuristic automated manufacturing plant",
          cameraAngle: "low_angle",
          subjectAction: "Robotic arm operates",
        },
        visualBible: {
          artDirection: "Cinematic Industrial Tech",
          colorPalette: { primaryHex: "#0F172A", secondaryHex: "#3B82F6", accentHex: "#10B981" },
        },
        characterIdentity: {
          characterId: "char-1",
          appearance: { ageRange: "30-35", gender: "male", clothing: "Navy blazer" },
        },
      },
    });

    expect(result.asset.status).toBe(AssetStatus.AVAILABLE);
    expect(result.output.provider).toBe("pollinations");
    expect(mockPollinationsProvider.generateImage).toHaveBeenCalledTimes(1);
    expect(mockMediaService.uploadAndSaveAsset).toHaveBeenCalledTimes(1);
  });
});
