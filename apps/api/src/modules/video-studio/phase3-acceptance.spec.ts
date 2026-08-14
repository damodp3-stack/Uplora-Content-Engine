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
import { TavilyResearchProvider } from "./providers/tavily-research.provider";
import { MediaService } from "../media/media.service";
import { MediaAsset, AssetType, AssetStatus } from "../media/entities/media-asset.entity";
import { MEDIA_STORAGE_PROVIDER } from "../media/providers/storage-provider.factory";
import { LocalStorageProvider } from "../media/providers/local-storage.provider";
import * as path from "path";
import * as fs from "fs/promises";

describe("Phase 3 End-to-End Infrastructure Acceptance Test Scenario", () => {
  let orchestrator: VideoProductionOrchestrator;
  let mediaService: MediaService;
  let storageProvider: LocalStorageProvider;
  let researchAgent: ResearchAgent;
  let tavilyProvider: TavilyResearchProvider;

  let savedProject: VideoProject;
  let recordedVersions: VideoDeliverableVersion[] = [];
  let savedShots: VideoShot[] = [];
  let savedMediaAssets: MediaAsset[] = [];
  let emittedEvents: Array<{ room: string; event: string; payload: any }> = [];

  const scratchDir = path.join(process.cwd(), "scratch", "phase3-acceptance-storage");
  const rawPrompt =
    "Create a 30 second Instagram Reel for Uplora explaining why industrial companies need a professional website.";

  beforeAll(async () => {
    savedProject = {
      id: "phase3-proj-777",
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
        if (key === "TAVILY_API_KEY") return "mock-tavily-key";
        return null;
      }),
    } as any;

    storageProvider = new LocalStorageProvider(mockConfigService);

    const mockAiEngine = {
      generateContent: jest.fn().mockImplementation(async (req) => {
        const fullPromptText = `${req.prompt} ${req.templateVariables?.systemPrompt || ""}`.toLowerCase();

        if (fullPromptText.includes("master creative director") || fullPromptText.includes("analyze this video idea")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation: Web Authority Wins RFQs",
              objective: "Educate B2B decision makers on automated web lead generation.",
              targetAudience: {
                persona: "VP of Manufacturing Operations",
                painPoints: ["High customer acquisition cost", "Outdated web presence"],
                desiredOutcome: "Automate quote inquiries with high authority web trust.",
              },
              narrativeAngle: "Problem-Agitation-Solution",
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
              coreMessage: "Your industrial website is your 24/7 top sales representative.",
              hook: "Most industrial buyers check your website before issuing an RFQ.",
              hookAlternatives: ["Is an outdated website costing your factory high-margin contracts?"],
              narrativeStructure: "Hook -> Problem -> Solution -> CTA",
              emotionalAngle: "Authority",
              pacingStrategy: "moderate",
              cta: { type: "link_in_bio", text: "Link in bio to audit your digital ROI." },
              audiencePsychology: "FOMO",
              retentionStrategy: "Visual pattern interrupt",
              visualStorytellingStrategy: "Cinematic drone shots to UI screen",
              platformStrategy: "Instagram Reels vertical 9:16",
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
                {
                  sceneIndex: 1,
                  suggestedDurationSec: 5.0,
                  sceneIntent: "hook",
                  narration: "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative.",
                  pacing: "moderate",
                  emotionalDelivery: "authoritative",
                },
                {
                  sceneIndex: 2,
                  suggestedDurationSec: 8.0,
                  sceneIntent: "problem",
                  narration: "If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts.",
                  pacing: "serious",
                  emotionalDelivery: "serious",
                },
                {
                  sceneIndex: 3,
                  suggestedDurationSec: 12.0,
                  sceneIntent: "solution",
                  narration: "Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies.",
                  pacing: "energetic",
                  emotionalDelivery: "inspiring",
                },
                {
                  sceneIndex: 4,
                  suggestedDurationSec: 5.0,
                  sceneIntent: "cta",
                  narration: "Click the link in our bio right now to audit your industrial digital ROI score today.",
                  pacing: "fast",
                  emotionalDelivery: "persuasive",
                },
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
                { shotNumber: 1, durationSec: 5.0, purpose: "hook", visualDescription: "Factory floor", cameraAngle: "low_angle", cameraMovement: "push_in", composition: "thirds", subjectAction: "Robotic arm", environment: "Plant", transition: "cut", narrationReference: "Most industrial decision makers...", generationPrompt: "9:16 industrial plant" },
                { shotNumber: 2, durationSec: 8.0, purpose: "problem", visualDescription: "Executive office", cameraAngle: "eye_level", cameraMovement: "static", composition: "centered", subjectAction: "Executive looking at monitor", environment: "Office", transition: "whip_pan", narrationReference: "If your website appears outdated...", generationPrompt: "9:16 moody executive office" },
                { shotNumber: 3, durationSec: 12.0, purpose: "solution", visualDescription: "Uplora portal UI", cameraAngle: "high_angle", cameraMovement: "pan_right", composition: "leading lines", subjectAction: "UI dashboard increments", environment: "Studio", transition: "zoom_blur", narrationReference: "Uplora transforms your web presence...", generationPrompt: "9:16 3D dashboard UI" },
                { shotNumber: 4, durationSec: 5.0, purpose: "cta", visualDescription: "Logo animation", cameraAngle: "eye_level", cameraMovement: "push_in", composition: "centered", subjectAction: "Button pulse", environment: "Studio", transition: "fade", narrationReference: "Click the link in our bio...", generationPrompt: "9:16 Uplora logo CTA" },
              ],
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 350, generationTime: 150, cost: 0.0025 },
          };
        } else if (fullPromptText.includes("visual effects director") || fullPromptText.includes("develop a visual bible")) {
          return {
            content: JSON.stringify({
              artDirection: "Cinematic Industrial Tech",
              visualStyle: "Photorealistic 35mm anamorphic",
              colorPalette: { primaryHex: "#0F172A", secondaryHex: "#3B82F6", accentHex: "#10B981", backgroundHex: "#020617", neutralHex: "#64748B" },
              lighting: "Volumetric cyan rim light",
              cameraLanguage: "60fps tracking",
              lensStyle: "35mm prime f/1.8",
              compositionRules: ["Thirds"],
              environmentStyle: "Automated plant",
              texture: "Matte metal",
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
              feedback: {
                humanNaturalness: "Natural conversational tone.",
                genericAI: "Free of clichés.",
                claimSafety: "100% verified evidence claims.",
                visualNarrative: "Strong vertical framing.",
                productionFeasibility: "Feasible.",
                productionReadiness: "Phase 3 media assets stored.",
              },
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 250, generationTime: 100, cost: 0.0015 },
          };
        } else {
          return {
            content: JSON.stringify({
              requiresHumanCharacters: true,
              requiresPersistentAssets: true,
              characters: [{ characterId: "char-1", name: "Alex Vance", role: "expert", appearance: { gender: "male", ageRange: "30-35", ethnicity: "South Asian", clothing: "Navy blazer", hairStyleColor: "Short neat black", facialFeatures: "Sharp jaw", bodyCharacteristics: "Athletic" }, voiceTraits: { gender: "male", age: "32", accent: "Indian English", tone: "authoritative" }, personality: "Tech Lead", behavior: "Direct eye contact", referencePrompt: "30yo tech innovator", negativePrompt: "casual", continuityRules: ["Navy blazer"] }],
              assets: [{ assetId: "asset-1", name: "Uplora Dashboard UI", category: "ui_element", appearance: "Dark mode UI", materials: ["Glass"], colors: ["#0F172A"], referencePrompt: "Dark mode UI screen", continuityRules: ["Blue accents"] }],
            }),
            metadata: { provider: "gemini", model: "gemini-3.6-flash", tokensUsed: 270, generationTime: 120, cost: 0.002 },
          };
        }
      }),
    };

    tavilyProvider = new TavilyResearchProvider(mockConfigService);

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
        TavilyResearchProvider,
        MediaService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AIEngineService, useValue: mockAiEngine },
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
    mediaService = moduleRef.get<MediaService>(MediaService);
    researchAgent = moduleRef.get<ResearchAgent>(ResearchAgent);
    
    // Inject real research provider into ResearchAgent
    researchAgent.setProvider(tavilyProvider);
  });

  afterAll(async () => {
    try {
      await fs.rm(scratchDir, { recursive: true, force: true });
    } catch {}
  });

  it("should execute complete Phase 3 infrastructure pipeline with real research engine & storage lifecycle", async () => {
    // 1. Start Phase 2 Creative Pipeline Execution
    await orchestrator.startProduction(savedProject.id);

    expect(savedProject.currentStage).toBe(VideoStage.COMPLETED);
    expect(savedProject.concept).toBeDefined();
    expect(savedProject.research).toBeDefined();

    // 2. Real Research Infrastructure Verification
    const researchData = savedProject.research;
    expect(researchData.status).toBeDefined();

    // 3. Media Asset Planning & Storage Lifecycle Verification
    const plannedImage = await mediaService.createPlannedAsset({
      workspaceId: savedProject.workspaceId,
      projectId: savedProject.id,
      shotId: "shot-1",
      assetType: AssetType.IMAGE,
      provider: "local",
    });

    expect(plannedImage.status).toBe(AssetStatus.PLANNED);
    expect(plannedImage.version).toBe(1);

    // Upload physical file data to local storage
    const fakeImageBuffer = Buffer.from("PNG-HEADER-BINARY-IMAGE-DATA-SHOT-1");
    const uploadedAsset = await mediaService.uploadAndSaveAsset(
      savedProject.workspaceId,
      savedProject.id,
      AssetType.IMAGE,
      "shot_1_keyframe.png",
      fakeImageBuffer,
      "image/png",
      "shot-1",
    );

    // Verify physical file exists in storage and status is AVAILABLE
    expect(uploadedAsset.status).toBe(AssetStatus.AVAILABLE);
    expect(uploadedAsset.size).toBe(fakeImageBuffer.byteLength);
    expect(uploadedAsset.checksum).toBeDefined();

    const physicalFileExists = await storageProvider.exists(uploadedAsset.storageKey);
    expect(physicalFileExists).toBe(true);

    // 4. Signed URL Security & Expiry Verification
    const signedUrl = await mediaService.generateSignedUrl(
      uploadedAsset.id,
      savedProject.workspaceId,
      1800,
    );
    expect(signedUrl).toContain("expires=");
    expect(signedUrl).toContain("signature=");

    // 5. Workspace Security Isolation Check
    await expect(
      mediaService.getAssetById(uploadedAsset.id, "ws-unauthorized-hacker"),
    ).rejects.toThrow();

    // 6. Asset Regeneration & Versioning Verification
    const regeneratedAsset = await mediaService.regenerateAsset(
      uploadedAsset.id,
      savedProject.workspaceId,
    );

    expect(uploadedAsset.status).toBe(AssetStatus.SUPERSEDED);
    expect(regeneratedAsset.version).toBe(2);
    expect(regeneratedAsset.parentAssetId).toBe(uploadedAsset.id);
    expect(regeneratedAsset.status).toBe(AssetStatus.PLANNED);

    // 7. WebSocket Event Emissions Verification
    expect(emittedEvents.length).toBeGreaterThan(0);
    const completedEvent = emittedEvents.find((e) => e.event === "production.completed");
    expect(completedEvent).toBeDefined();
  });
});
