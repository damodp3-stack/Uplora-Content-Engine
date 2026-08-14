import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { VideoProductionOrchestrator } from "./video-production.orchestrator";
import { VideoProject, VideoStage } from "./entities/video-project.entity";
import { VideoShot } from "./entities/video-shot.entity";
import { VideoDeliverableVersion } from "./entities/video-deliverable-version.entity";
import { CollaborationGateway } from "../realtime/collaboration.gateway";
import { CreativeDirectorAgent } from "./agents/creative-director.agent";
import { ResearchAgent } from "./agents/research.agent";
import { ContentStrategistAgent } from "./agents/content-strategist.agent";
import { ScriptWriterAgent } from "./agents/script-writer.agent";
import { StoryboardDirectorAgent } from "./agents/storyboard-director.agent";
import { VisualDirectorAgent } from "./agents/visual-director.agent";
import { CharacterAssetAgent } from "./agents/character-asset.agent";
import { QualityEvaluatorAgent } from "./agents/quality-evaluator.agent";

describe("VideoProductionOrchestrator", () => {
  let orchestrator: VideoProductionOrchestrator;
  let testProject: VideoProject;
  let mockProjectRepo: Partial<Repository<VideoProject>>;
  let mockShotRepo: Partial<Repository<VideoShot>>;
  let mockVersionRepo: Partial<Repository<VideoDeliverableVersion>>;
  let mockGateway: Partial<CollaborationGateway>;

  let mockCreativeDirector: Partial<CreativeDirectorAgent>;
  let mockResearchAgent: Partial<ResearchAgent>;
  let mockContentStrategist: Partial<ContentStrategistAgent>;
  let mockScriptWriter: Partial<ScriptWriterAgent>;
  let mockStoryboardDirector: Partial<StoryboardDirectorAgent>;
  let mockVisualDirector: Partial<VisualDirectorAgent>;
  let mockCharacterAsset: Partial<CharacterAssetAgent>;
  let mockQualityEvaluator: Partial<QualityEvaluatorAgent>;

  beforeEach(() => {
    testProject = {
      id: "proj-123",
      workspaceId: "ws-1",
      authorId: "usr-1",
      title: "Test Project",
      rawPrompt: "Create a 30s video about AI",
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
    } as VideoProject;

    mockProjectRepo = {
      findOne: jest.fn().mockResolvedValue(testProject),
      save: jest.fn().mockImplementation(async (p) => {
        Object.assign(testProject, p);
        return testProject;
      }),
    };

    mockShotRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockImplementation((s) => s),
      save: jest.fn().mockImplementation(async (s) => s),
      remove: jest.fn().mockResolvedValue([]),
    };

    mockVersionRepo = {
      count: jest.fn().mockResolvedValue(0),
      update: jest.fn().mockResolvedValue({ affected: 1 } as any),
      create: jest.fn().mockImplementation((v) => v),
      save: jest.fn().mockImplementation(async (v) => v),
    };

    mockGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      } as any,
    };

    mockCreativeDirector = {
      developConcept: jest.fn().mockResolvedValue({
        title: "AI Video",
        objective: "Educate",
        targetAudience: { persona: "Devs", painPoints: ["Time"], desiredOutcome: "Learn" },
        narrativeAngle: "Modern AI",
        contentFormat: "reel",
        platform: "instagram_reels",
        duration: 30,
        language: "english",
        tone: "informative",
        hookStrategy: "Stat",
        creativeDirection: "Clean"
      })
    };

    mockResearchAgent = {
      collectResearch: jest.fn().mockResolvedValue({
        status: "AVAILABLE",
        summary: "Res",
        insights: [],
        terminology: [],
        collectedAt: new Date().toISOString(),
        provider: "gemini"
      })
    };

    mockContentStrategist = {
      buildStrategy: jest.fn().mockResolvedValue({
        coreMessage: "AI is fast",
        hook: "Did you know?",
        hookAlternatives: ["What if?"],
        narrativeStructure: "Hook-Solution",
        emotionalAngle: "Excitement",
        pacingStrategy: "fast",
        cta: { type: "link", text: "Click" },
        audiencePsychology: "Curiosity",
        retentionStrategy: "Visuals",
        visualStorytellingStrategy: "Graphics",
        platformStrategy: "Reels"
      })
    };

    mockScriptWriter = {
      writeScript: jest.fn().mockResolvedValue({
        title: "AI Video",
        estimatedDurationSec: 30,
        language: { script: "english", voice: "english", subtitles: "english" },
        scenes: [{ sceneIndex: 1, suggestedDurationSec: 30, sceneIntent: "main", narration: "narration text", pacing: "fast", emotionalDelivery: "hyped" }],
        fullNarrationText: "narration text",
        wordCount: 2,
        wordsPerMinute: 145,
        estimatedSpeechDurationMs: 30000,
        targetDurationMs: 30000,
        timingVarianceMs: 0,
        timingStatus: "TIMING_VALIDATED"
      })
    };

    mockStoryboardDirector = {
      createStoryboard: jest.fn().mockResolvedValue({
        totalShots: 1,
        estimatedTotalDurationSec: 30,
        shots: [{ shotNumber: 1, durationSec: 30, purpose: "main", visualDescription: "AI studio", cameraAngle: "eye_level", cameraMovement: "static", composition: "centered", subjectAction: "host talks", environment: "studio", transition: "fade", narrationReference: "narration text", generationPrompt: "prompt" }]
      })
    };

    mockVisualDirector = {
      createVisualBible: jest.fn().mockResolvedValue({
        artDirection: "Cyberpunk",
        visualStyle: "Neon",
        colorPalette: { primaryHex: "#000", secondaryHex: "#fff", accentHex: "#f00", backgroundHex: "#111", neutralHex: "#888" },
        lighting: "Bright",
        cameraLanguage: "Cinematic",
        lensStyle: "35mm",
        compositionRules: ["Thirds"],
        environmentStyle: "Studio",
        texture: "Smooth",
        motionLanguage: "Fast",
        typographyDirection: "Sans",
        negativePrompts: "Ugly",
        consistencyRules: ["Rule 1"]
      })
    };

    mockCharacterAsset = {
      generateProfiles: jest.fn().mockResolvedValue({
        requiresHumanCharacters: true,
        requiresPersistentAssets: true,
        characters: [{ characterId: "char-1", name: "Alex", role: "expert", appearance: { gender: "male", ageRange: "30", ethnicity: "Asian", clothing: "Blazer", hairStyleColor: "Black", facialFeatures: "Sharp", bodyCharacteristics: "Athletic" }, voiceTraits: { gender: "male", age: "32", accent: "Clear", tone: "Warm" }, personality: "Tech Lead", behavior: "Eye contact", referencePrompt: "Tech lead", negativePrompt: "casual", continuityRules: ["Blazer"] }],
        assets: []
      })
    };

    mockQualityEvaluator = {
      evaluateQuality: jest.fn().mockResolvedValue({
        humanNaturalnessScore: 90,
        genericAIScore: 95,
        claimSafetyScore: 100,
        visualNarrativeScore: 90,
        productionFeasibilityScore: 95,
        blueprintQualityScore: 94,
        productionReadinessScore: 0,
        feedback: {
          humanNaturalness: "Natural",
          genericAI: "Clean",
          claimSafety: "Safe",
          visualNarrative: "Strong",
          productionFeasibility: "Feasible",
          productionReadiness: "Blueprint only"
        }
      })
    };

    orchestrator = new VideoProductionOrchestrator(
      mockProjectRepo as Repository<VideoProject>,
      mockShotRepo as Repository<any>,
      mockVersionRepo as Repository<any>,
      mockGateway as CollaborationGateway,
      mockCreativeDirector as CreativeDirectorAgent,
      mockResearchAgent as ResearchAgent,
      mockContentStrategist as ContentStrategistAgent,
      mockScriptWriter as ScriptWriterAgent,
      mockStoryboardDirector as StoryboardDirectorAgent,
      mockVisualDirector as VisualDirectorAgent,
      mockCharacterAsset as CharacterAssetAgent,
      mockQualityEvaluator as QualityEvaluatorAgent,
    );
  });

  it("should execute full Phase 2 production pipeline cleanly", async () => {
    await orchestrator.startProduction("proj-123");

    expect(mockCreativeDirector.developConcept).toHaveBeenCalledTimes(1);
    expect(mockResearchAgent.collectResearch).toHaveBeenCalledTimes(1);
    expect(mockContentStrategist.buildStrategy).toHaveBeenCalledTimes(1);
    expect(mockScriptWriter.writeScript).toHaveBeenCalledTimes(1);
    expect(mockStoryboardDirector.createStoryboard).toHaveBeenCalledTimes(1);
    expect(mockVisualDirector.createVisualBible).toHaveBeenCalledTimes(1);
    expect(mockCharacterAsset.generateProfiles).toHaveBeenCalledTimes(1);
    expect(mockQualityEvaluator.evaluateQuality).toHaveBeenCalledTimes(1);

    expect(testProject.currentStage).toBe(VideoStage.COMPLETED);
    expect(testProject.overallProgressPercent).toBe(100);
  });

  it("should invalidate downstream stages when a stage is regenerated", async () => {
    testProject.stageStatuses = {
      [VideoStage.IDEA_ANALYSIS]: "completed",
      [VideoStage.RESEARCH]: "completed",
      [VideoStage.STRATEGY]: "completed",
      [VideoStage.SCRIPTING]: "completed",
      [VideoStage.STORYBOARDING]: "completed",
      [VideoStage.VISUAL_DESIGN]: "completed",
    };

    await orchestrator.regenerateStage("proj-123", VideoStage.STRATEGY, true);

    expect(testProject.stageStatuses[VideoStage.SCRIPTING]).toBe("completed");
    expect(mockContentStrategist.buildStrategy).toHaveBeenCalledTimes(1);
  });
});
