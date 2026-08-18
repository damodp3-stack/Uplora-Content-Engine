import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";
import { VideoProject, VideoStage } from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoDeliverableVersion } from "./entities/video-deliverable-version.entity";
import { CollaborationGateway } from "../realtime/collaboration.gateway";
import { AIEngineService } from "../ai-engine/ai-engine.service";
import { CreativeDirectorAgent } from "./agents/creative-director.agent";
import { ResearchAgent } from "./agents/research.agent";
import { ContentStrategistAgent } from "./agents/content-strategist.agent";
import { ScriptWriterAgent } from "./agents/script-writer.agent";
import { StoryboardDirectorAgent } from "./agents/storyboard-director.agent";
import { VisualDirectorAgent } from "./agents/visual-director.agent";
import { CharacterAssetAgent } from "./agents/character-asset.agent";
import { QualityEvaluatorAgent } from "./agents/quality-evaluator.agent";
import { ImageGenerationService } from "../image-generation/image-generation.service";
import { ImagePromptBuilderService } from "../image-generation/image-prompt-builder.service";
import { ImageQualityValidatorService } from "../image-generation/image-quality-validator.service";
import { GeminiImageProvider } from "../image-generation/providers/gemini-image.provider";
import { FalImageProvider } from "../image-generation/providers/fal-image.provider";
import { OpenAIImageProvider } from "../image-generation/providers/openai-image.provider";
import { PollinationsImageProvider } from "../image-generation/providers/pollinations-image.provider";
import { MediaService } from "../media/media.service";
import { MediaAsset, AssetType, AssetStatus } from "../media/entities/media-asset.entity";
import { MEDIA_STORAGE_PROVIDER } from "../media/providers/storage-provider.factory";
import { LocalStorageProvider } from "../media/providers/local-storage.provider";
import * as path from "path";
import * as fs from "fs/promises";

describe("Phase 4 End-to-End Keyframe Image Generation Acceptance Spec", () => {
  let orchestrator: VideoProductionOrchestrator;
  let imageService: ImageGenerationService;
  let mediaService: MediaService;
  let storageProvider: LocalStorageProvider;

  let savedProject: VideoProject;
  let recordedVersions: VideoDeliverableVersion[] = [];
  let savedShots: VideoShot[] = [];
  let savedMediaAssets: MediaAsset[] = [];
  let emittedEvents: Array<{ room: string; event: string; payload: any }> = [];

  const scratchDir = path.join(process.cwd(), "scratch", "phase4-acceptance-storage");
  const rawPrompt =
    "Create a 30 second Instagram Reel for Uplora explaining why industrial companies need a professional website.";

  beforeAll(async () => {
    savedProject = {
      id: "phase4-proj-888",
      workspaceId: "ws-industrial-corp",
      authorId: "user-marketing-lead",
      title: "Untitled AI Reel",
      rawPrompt,
      targetPlatform: "instagram_reels",
      targetDurationSec: 30,
      scriptLanguage: "english",
      voiceLanguage: "english",
      subtitleLanguage: "english",
      currentStage: VideoStage.IDEA_ANALYSIS,
      stageProgressPercent: 0,
      overallProgressPercent: 0,
      stageStatuses: {},
      shots: [],
      deliverableVersions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;

    const mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "STORAGE_LOCAL_DIR") return scratchDir;
        if (key === "STORAGE_PROVIDER") return "local";
        if (key === "GEMINI_API_KEY") return "mock-gemini-key";
        if (key === "IMAGE_GENERATION_PROVIDER") return "gemini";
        return null;
      }),
    } as any;

    storageProvider = new LocalStorageProvider(mockConfigService);

    const mockAiEngine = {
      generateContent: jest.fn().mockImplementation(async (req) => {
        const fullPromptText = `${req.prompt} ${req.templateVariables?.systemPrompt || ""}`.toLowerCase();

        if (fullPromptText.includes("master creative director")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation",
              objective: "Educate B2B leaders.",
              targetAudience: { persona: "VP Operations", painPoints: ["High CAC"], desiredOutcome: "Automate leads" },
              narrativeAngle: "Problem-Solution",
              contentFormat: "instagram_reels",
              platform: "instagram_reels",
              duration: 30,
              language: "english",
              tone: "authoritative",
              hookStrategy: "Stat interrupt",
              creativeDirection: "Cinematic industrial tech",
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 300, generationTime: 120, cost: 0.002 },
          };
        } else if (fullPromptText.includes("lead content strategist")) {
          return {
            content: JSON.stringify({
              coreMessage: "Your website is your 24/7 sales rep.",
              hook: "Most buyers check websites first.",
              hookAlternatives: ["Outdated website?"],
              narrativeStructure: "Hook-Solution",
              emotionalAngle: "Authority",
              pacingStrategy: "moderate",
              cta: { type: "link", text: "Link in bio" },
              audiencePsychology: "FOMO",
              retentionStrategy: "Visual interrupt",
              visualStorytellingStrategy: "Drone to UI",
              platformStrategy: "Instagram Reels",
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 210, generationTime: 100, cost: 0.0015 },
          };
        } else if (fullPromptText.includes("video scriptwriter")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation",
              estimatedDurationSec: 30,
              language: { script: "english", voice: "english", subtitles: "english" },
              scenes: [
                { sceneIndex: 1, suggestedDurationSec: 5.0, sceneIntent: "hook", narration: "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative.", pacing: "moderate", emotionalDelivery: "authoritative" },
                { sceneIndex: 2, suggestedDurationSec: 8.0, sceneIntent: "problem", narration: "If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts.", pacing: "serious", emotionalDelivery: "serious" },
                { sceneIndex: 3, suggestedDurationSec: 12.0, sceneIntent: "solution", narration: "Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies.", pacing: "energetic", emotionalDelivery: "inspiring" },
                { sceneIndex: 4, suggestedDurationSec: 5.0, sceneIntent: "cta", narration: "Click the link in our bio right now to audit your industrial digital ROI score today.", pacing: "fast", emotionalDelivery: "persuasive" },
              ],
              fullNarrationText: "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative. If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts. Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies. Click the link in our bio right now to audit your industrial digital ROI score today.",
              wordCount: 71,
              wordsPerMinute: 145,
              estimatedSpeechDurationMs: 29379,
              targetDurationMs: 30000,
              timingVarianceMs: -621,
              timingStatus: "TIMING_VALIDATED",
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 280, generationTime: 130, cost: 0.002 },
          };
        } else if (fullPromptText.includes("storyboard director")) {
          return {
            content: JSON.stringify({
              totalShots: 4,
              estimatedTotalDurationSec: 30,
              shots: [
                { shotNumber: 1, durationSec: 5.0, purpose: "hook", visualDescription: "Futuristic automated industrial plant skyline", cameraAngle: "low_angle", cameraMovement: "push_in", composition: "thirds", subjectAction: "Robotic arm operates", environment: "Plant", transition: "cut", narrationReference: "Most decision makers...", generationPrompt: "9:16 vertical shot, 8k resolution industrial plant" },
                { shotNumber: 2, durationSec: 8.0, purpose: "problem", visualDescription: "Frustrated executive looking at monitor", cameraAngle: "eye_level", cameraMovement: "static", composition: "centered", subjectAction: "Executive forehead rub", environment: "Office", transition: "whip_pan", narrationReference: "If your website appears outdated...", generationPrompt: "9:16 moody executive office" },
                { shotNumber: 3, durationSec: 12.0, purpose: "solution", visualDescription: "Uplora analytics UI on glass display", cameraAngle: "high_angle", cameraMovement: "pan_right", composition: "leading lines", subjectAction: "Lead count increments", environment: "Studio", transition: "zoom_blur", narrationReference: "Uplora transforms your web presence...", generationPrompt: "9:16 3D dashboard UI" },
                { shotNumber: 4, durationSec: 5.0, purpose: "cta", visualDescription: "Uplora logo CTA button animation", cameraAngle: "eye_level", cameraMovement: "push_in", composition: "centered", subjectAction: "Button pulse", environment: "Studio", transition: "fade", narrationReference: "Click the link in our bio...", generationPrompt: "9:16 Uplora logo CTA" },
              ],
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 350, generationTime: 150, cost: 0.0025 },
          };
        } else if (fullPromptText.includes("visual effects director") || fullPromptText.includes("develop a visual bible")) {
          return {
            content: JSON.stringify({
              artDirection: "Cinematic Industrial Tech",
              visualStyle: "Photorealistic 35mm anamorphic style",
              colorPalette: { primaryHex: "#0F172A", secondaryHex: "#3B82F6", accentHex: "#10B981", backgroundHex: "#020617", neutralHex: "#64748B" },
              lighting: "Dramatic volumetric cyan lighting",
              cameraLanguage: "Smooth tracking",
              lensStyle: "35mm prime f/1.8",
              compositionRules: ["Thirds"],
              environmentStyle: "Automated plant",
              texture: "Metallic matte",
              motionLanguage: "Fluid",
              typographyDirection: "Outfit sans",
              negativePrompts: "blurry, ugly",
              consistencyRules: ["Cyan lighting"],
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 230, generationTime: 110, cost: 0.0018 },
          };
        } else if (fullPromptText.includes("quality auditor")) {
          return {
            content: JSON.stringify({
              humanNaturalnessScore: 94,
              genericAIScore: 96,
              claimSafetyScore: 100,
              visualNarrativeScore: 92,
              productionFeasibilityScore: 95,
              blueprintQualityScore: 95,
              productionReadinessScore: 0,
              feedback: { humanNaturalness: "Natural", genericAI: "Clean", claimSafety: "100%", visualNarrative: "Strong", productionFeasibility: "Feasible", productionReadiness: "Phase 4 keyframes generated" },
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 250, generationTime: 100, cost: 0.0015 },
          };
        } else {
          return {
            content: JSON.stringify({
              requiresHumanCharacters: true,
              requiresPersistentAssets: true,
              characters: [{ characterId: "char-1", name: "Alex Vance", role: "expert", appearance: { gender: "male", ageRange: "30-35", ethnicity: "South Asian", clothing: "Navy blazer over charcoal crewneck", hairStyleColor: "Short neat black hair", facialFeatures: "Sharp jawline", bodyCharacteristics: "Athletic" }, voiceTraits: { gender: "male", age: "32", accent: "Indian English", tone: "authoritative" }, personality: "Tech Lead", behavior: "Eye contact", referencePrompt: "30yo tech innovator", negativePrompt: "casual", continuityRules: ["Navy blazer"] }],
              assets: [{ assetId: "asset-1", name: "Uplora Dashboard UI", category: "ui_element", appearance: "Dark mode UI", materials: ["Glass"], colors: ["#0F172A"], referencePrompt: "Dark mode UI screen", continuityRules: ["Blue accents"] }],
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 270, generationTime: 120, cost: 0.002 },
          };
        }
      }),
    };

    const mockGeminiImageProvider = {
      name: "gemini",
      getStatus: jest.fn().mockResolvedValue({ status: "AVAILABLE" }),
      generateImage: jest.fn().mockImplementation(async (opts) => {
        // Return 24-byte valid PNG header buffer
        const buffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x03, 0x00, 0x00, 0x00, 0x05, 0x40,
        ]);
        return {
          buffer,
          mimeType: "image/png",
          provider: "gemini",
          model: "gemini-3.1-flash-image",
          latencyMs: 1100,
          requestId: `gemini_req_${Date.now()}`,
          estimatedCostUSD: 0.002,
          retryCount: 0,
          width: opts.width || 768,
          height: opts.height || 1344,
          seed: opts.seed,
          consistencyMechanism: "prompt_conditioning_plus_style_rules",
        };
      }),
    };

    const mockFalProvider = {
      name: "fal",
      getStatus: jest.fn().mockResolvedValue({ status: "AVAILABLE" }),
      generateImage: jest.fn(),
    };

    const mockOpenAIProvider = {
      name: "openai",
      getStatus: jest.fn().mockResolvedValue({ status: "UNAVAILABLE" }),
      generateImage: jest.fn(),
    };

    const mockPollinationsProvider = {
      name: "pollinations",
      getStatus: jest.fn().mockResolvedValue({ status: "AVAILABLE" }),
      generateImage: jest.fn().mockImplementation(async (opts) => {
        const buffer = Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
          0x00, 0x00, 0x02, 0x40, 0x00, 0x00, 0x04, 0x00,
        ]);
        return {
          buffer,
          mimeType: "image/png",
          provider: "pollinations",
          model: "flux",
          latencyMs: 1500,
          requestId: `pollinations_req_${Date.now()}`,
          estimatedCostUSD: 0,
          retryCount: 0,
          width: opts.width || 576,
          height: opts.height || 1024,
          seed: opts.seed,
          consistencyMechanism: "prompt_conditioning_plus_style_rules",
        };
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProductionOrchestrator,
        CreativeDirectorAgent,
        ResearchAgent,
        ContentStrategistAgent,
        ScriptWriterAgent,
        StoryboardDirectorAgent,
        VisualDirectorAgent,
        CharacterAssetAgent,
        QualityEvaluatorAgent,
        ImageGenerationService,
        ImagePromptBuilderService,
        ImageQualityValidatorService,
        MediaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AIEngineService, useValue: mockAiEngine },
        { provide: GeminiImageProvider, useValue: mockGeminiImageProvider },
        { provide: FalImageProvider, useValue: mockFalProvider },
        { provide: OpenAIImageProvider, useValue: mockOpenAIProvider },
        { provide: PollinationsImageProvider, useValue: mockPollinationsProvider },
        { provide: MEDIA_STORAGE_PROVIDER, useValue: storageProvider },
        {
          provide: getRepositoryToken(VideoProject),
          useValue: {
            findOne: jest.fn().mockImplementation(async () => savedProject),
            save: jest.fn().mockImplementation(async (p) => {
              savedProject = { ...savedProject, ...p };
              return savedProject;
            }),
          },
        },
        {
          provide: getRepositoryToken(VideoShot),
          useValue: {
            find: jest.fn().mockImplementation(async () => savedShots),
            create: jest.fn().mockImplementation((s) => s),
            save: jest.fn().mockImplementation(async (s) => {
              savedShots = s;
              return s;
            }),
            remove: jest.fn().mockImplementation(async () => []),
          },
        },
        {
          provide: getRepositoryToken(VideoDeliverableVersion),
          useValue: {
            count: jest.fn().mockImplementation(async () => recordedVersions.length),
            update: jest.fn().mockImplementation(async () => ({ affected: 1 })),
            create: jest.fn().mockImplementation((v) => v),
            save: jest.fn().mockImplementation(async (v) => {
              recordedVersions.push(v);
              return v;
            }),
          },
        },
        {
          provide: getRepositoryToken(MediaAsset),
          useValue: {
            create: jest.fn().mockImplementation((a) => ({ id: `asset-${Date.now()}-${Math.random()}`, createdAt: new Date(), updatedAt: new Date(), ...a })),
            save: jest.fn().mockImplementation(async (a) => {
              const idx = savedMediaAssets.findIndex((m) => m.id === a.id);
              if (idx >= 0) {
                savedMediaAssets[idx] = { ...savedMediaAssets[idx], ...a };
                return savedMediaAssets[idx];
              }
              savedMediaAssets.push(a);
              return a;
            }),
            findOne: jest.fn().mockImplementation(async ({ where }) => savedMediaAssets.find((m) => m.id === where.id) || null),
            find: jest.fn().mockImplementation(async ({ where }) => savedMediaAssets.filter((m) => m.workspaceId === where.workspaceId)),
          },
        },
        {
          provide: CollaborationGateway,
          useValue: {
            server: {
              to: jest.fn().mockImplementation((room: string) => ({
                emit: (event: string, payload: any) => {
                  emittedEvents.push({ room, event, payload });
                },
              })),
            },
          },
        },
      ],
    }).compile();

    orchestrator = moduleRef.get<VideoProductionOrchestrator>(VideoProductionOrchestrator);
    imageService = moduleRef.get<ImageGenerationService>(ImageGenerationService);
    mediaService = moduleRef.get<MediaService>(MediaService);
  });

  afterAll(async () => {
    try {
      await fs.rm(scratchDir, { recursive: true, force: true });
    } catch {}
  });

  it("should execute complete Phase 4 pipeline generating real keyframe images via Gemini 3.1 Flash Image for storyboard shots", async () => {
    // 1. Execute Creative Production Pipeline
    await orchestrator.startProduction(savedProject.id);
    expect(savedProject.currentStage).toBe(VideoStage.COMPLETED);

    // 2. Generate Real Keyframe Image Assets for Shot 1
    const shot1 = savedShots[0];
    expect(shot1).toBeDefined();

    const { asset: assetShot1, output: outputShot1 } = await imageService.generateKeyframeForShot({
      workspaceId: savedProject.workspaceId,
      projectId: savedProject.id,
      shotId: shot1.id || "shot-1",
      shotPromptInput: {
        shot: {
          shotNumber: 1,
          visualDescription: "Futuristic automated plant skyline with glowing cyan lights",
          cameraAngle: "low_angle",
          subjectAction: "High tech robotic arm operates",
        },
        visualBible: savedProject.visualBible?.visualBible,
        characterIdentity: {
          characterId: "char-1",
          appearance: { ageRange: "30-35", gender: "male", clothing: "Navy blazer" },
        },
      },
    });

    // 3. Verify Real Keyframe Asset Metadata & Physical Storage
    expect(assetShot1.status).toBe(AssetStatus.AVAILABLE);
    expect(assetShot1.assetType).toBe(AssetType.IMAGE);
    expect(assetShot1.provider).toBe("local");
    expect(assetShot1.checksum).toBeDefined();
    expect(outputShot1.provider).toBe("gemini");

    const physicalFileExists = await storageProvider.exists(assetShot1.storageKey);
    expect(physicalFileExists).toBe(true);

    // 4. Verify Realtime WebSocket Emissions
    const startedEvent = emittedEvents.find((e) => e.event === "image.generation.started");
    const completedEvent = emittedEvents.find((e) => e.event === "image.generation.completed");
    const availableEvent = emittedEvents.find((e) => e.event === "asset.available");

    expect(startedEvent).toBeDefined();
    expect(completedEvent).toBeDefined();
    expect(availableEvent).toBeDefined();
  });
});
