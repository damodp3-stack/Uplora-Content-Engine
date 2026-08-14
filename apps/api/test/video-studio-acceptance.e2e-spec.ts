import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { getQueueToken } from "@nestjs/bull";
import { VideoProductionOrchestrator } from "../src/modules/video-studio/video-production.orchestrator";
import { VideoProject, VideoStage } from "../src/modules/video-studio/entities/video-project.entity";
import { VideoShot } from "../src/modules/video-studio/entities/video-shot.entity";
import { VideoDeliverableVersion } from "../src/modules/video-studio/entities/video-deliverable-version.entity";
import { CollaborationGateway } from "../src/modules/realtime/collaboration.gateway";
import { AIEngineService } from "../src/modules/ai-engine/ai-engine.service";
import { CreativeDirectorAgent } from "../src/modules/video-studio/agents/creative-director.agent";
import { ResearchAgent } from "../src/modules/video-studio/agents/research.agent";
import { ContentStrategistAgent } from "../src/modules/video-studio/agents/content-strategist.agent";
import { ScriptWriterAgent } from "../src/modules/video-studio/agents/script-writer.agent";
import { StoryboardDirectorAgent } from "../src/modules/video-studio/agents/storyboard-director.agent";
import { VisualDirectorAgent } from "../src/modules/video-studio/agents/visual-director.agent";
import { CharacterAssetAgent } from "../src/modules/video-studio/agents/character-asset.agent";
import { CreativeConceptSchema, StrategyBlueprintSchema, ScriptDocumentSchema, StoryboardSchema, VisualBibleSchema } from "../src/modules/video-studio/schemas/phase2-deliverables.schema";

describe("Phase 2 End-to-End Acceptance Test Scenario", () => {
  let orchestrator: VideoProductionOrchestrator;
  let savedProject: VideoProject;
  let recordedVersions: any[] = [];
  let savedShots: any[] = [];
  let emittedEvents: Array<{ room: string; event: string; payload: any }> = [];

  const rawPrompt = "Create a 30 second Instagram Reel for Uplora explaining why industrial companies need a professional website.";

  beforeAll(async () => {
    savedProject = {
      id: "acceptance-proj-999",
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
      updatedAt: new Date()
    } as any;

    const mockAiEngine = {
      generateContent: jest.fn().mockImplementation(async (req) => {
        const promptText = req.prompt.toLowerCase();
        if (promptText.includes("creative concept")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation: Why Modern Web Presence Wins Deals",
              objective: "Educate industrial business leaders on automated lead acquisition via digital portals.",
              targetAudience: {
                persona: "Industrial Operations Directors & VP of Sales",
                painPoints: ["High customer acquisition costs", "Reliance on trade shows", "Slow quote turnaround"],
                desiredOutcome: "Automate inbound quote generation and build high authority trust."
              },
              narrativeAngle: "Problem-Agitation-Solution: Factory Floor to Digital Portal",
              contentFormat: "instagram_reels",
              platform: "instagram_reels",
              duration: 30,
              language: "english",
              tone: "authoritative",
              hookStrategy: "Stat interrupt: 92% of B2B buyers audit websites before issuing an RFQ.",
              creativeDirection: "Cinematic industrial tech aesthetic with glowing cyan lighting."
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 300, generationTime: 120, cost: 0.002 }
          };
        } else if (promptText.includes("research")) {
          return {
            content: JSON.stringify({
              status: "AVAILABLE",
              summary: "Industrial procurement has shifted to online research prior to sales representative contact.",
              insights: [{ category: "audience_insight", claim: "92% of industrial buyers perform digital due diligence", source: "Industrial B2B Report 2026", confidence: "high" }],
              terminology: ["RFQ", "CAD Spec", "Digital Twin"],
              collectedAt: new Date().toISOString(),
              provider: "openai"
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 150, generationTime: 80, cost: 0.001 }
          };
        } else if (promptText.includes("strategist")) {
          return {
            content: JSON.stringify({
              coreMessage: "Your industrial website is your top 24/7 sales representative.",
              hook: "92% of industrial buyers check your website before issuing an RFQ.",
              hookAlternatives: ["Is your $10M factory losing contracts due to a 2012 website?"],
              narrativeStructure: "Hook -> Industrial Agitation -> Digital Solution -> CTA",
              emotionalAngle: "Urgency and competitive authority",
              pacingStrategy: "fast",
              cta: { type: "link_in_bio", text: "Link in bio to calculate your industrial digital ROI." },
              audiencePsychology: "Triggers fear of missing out on high-margin automated RFQs.",
              retentionStrategy: "Visual pattern interrupt at second 3 with high-contrast UI overlay.",
              visualStorytellingStrategy: "Cinematic factory drone shots shifting to crisp digital UI.",
              platformStrategy: "Optimized for Instagram Reels vertical 9:16 feed."
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 210, generationTime: 100, cost: 0.0015 }
          };
        } else if (promptText.includes("scriptwriter") || promptText.includes("timed 30-second script")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation",
              estimatedDurationSec: 30,
              language: { script: "english", voice: "english", subtitles: "english" },
              scenes: [
                { sceneIndex: 1, suggestedDurationSec: 5.0, sceneIntent: "hook", narration: "92% of industrial buyers check your website before issuing an RFQ.", pacing: "fast", emotionalDelivery: "authoritative" },
                { sceneIndex: 2, suggestedDurationSec: 8.0, sceneIntent: "problem", narration: "An outdated website signals an outdated manufacturing capability.", pacing: "serious", emotionalDelivery: "serious" },
                { sceneIndex: 3, suggestedDurationSec: 12.0, sceneIntent: "solution", narration: "Uplora turns site visitors into automated high-margin RFQs 24/7.", pacing: "energetic", emotionalDelivery: "inspiring" },
                { sceneIndex: 4, suggestedDurationSec: 5.0, sceneIntent: "cta", narration: "Link in bio to audit your industrial digital ROI score today.", pacing: "fast", emotionalDelivery: "persuasive" }
              ],
              fullNarrationText: "92% of industrial buyers check your website before issuing an RFQ. An outdated website signals an outdated manufacturing capability. Uplora turns site visitors into automated high-margin RFQs 24/7. Link in bio to audit your industrial digital ROI score today.",
              wordCount: 42
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 280, generationTime: 130, cost: 0.002 }
          };
        } else if (promptText.includes("storyboard")) {
          return {
            content: JSON.stringify({
              totalShots: 4,
              estimatedTotalDurationSec: 30,
              shots: [
                { shotNumber: 1, durationSec: 5.0, purpose: "hook", visualDescription: "Sleek industrial plant skyline at dusk with glowing cyan lights", cameraAngle: "low_angle", cameraMovement: "push_in", composition: "rule of thirds", subjectAction: "High-tech robotic arm operating seamlessly", environment: "Modern automated plant", transition: "cut", narrationReference: "92% of industrial buyers check your website before issuing an RFQ.", generationPrompt: "9:16 vertical shot, 8k resolution, cinematic industrial factory" },
                { shotNumber: 2, durationSec: 8.0, purpose: "problem", visualDescription: "Close up of frustrated executive looking at slow loading legacy website on desktop monitor", cameraAngle: "eye_level", cameraMovement: "static", composition: "centered framing", subjectAction: "Executive rubbing forehead", environment: "Dim office", transition: "whip_pan", narrationReference: "An outdated website signals an outdated manufacturing capability.", generationPrompt: "9:16 vertical shot, moody lighting executive office" },
                { shotNumber: 3, durationSec: 12.0, purpose: "solution", visualDescription: "Futuristic Uplora digital analytics portal UI glowing on smartphone glass display", cameraAngle: "high_angle", cameraMovement: "pan_right", composition: "diagonal leading lines", subjectAction: "Lead count increments in real time", environment: "Minimalist studio", transition: "zoom_blur", narrationReference: "Uplora turns site visitors into automated high-margin RFQs 24/7.", generationPrompt: "9:16 vertical shot, 3d analytics dashboard UI screen" },
                { shotNumber: 4, durationSec: 5.0, purpose: "cta", visualDescription: "Uplora logo animation with prominent CTA button", cameraAngle: "eye_level", cameraMovement: "push_in", composition: "centered", subjectAction: "Button pulse animation", environment: "Branded studio backdrop", transition: "fade", narrationReference: "Link in bio to audit your industrial digital ROI score today.", generationPrompt: "9:16 vertical shot, Uplora logo animation" }
              ]
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 350, generationTime: 150, cost: 0.0025 }
          };
        } else if (promptText.includes("visual bible") || promptText.includes("production designer")) {
          return {
            content: JSON.stringify({
              artDirection: "Cinematic Industrial Tech",
              visualStyle: "Photorealistic 35mm anamorphic style with high contrast and cyan accents",
              colorPalette: { primaryHex: "#0F172A", secondaryHex: "#3B82F6", accentHex: "#10B981", backgroundHex: "#020617", neutralHex: "#64748B" },
              lighting: "Dramatic volumetric cyan and amber rim lighting",
              cameraLanguage: "Smooth 60fps tracking motion",
              lensStyle: "35mm anamorphic prime lens, shallow depth of field f/1.8",
              compositionRules: ["Rule of thirds", "Vertical center alignment"],
              environmentStyle: "Modern automated industrial facility",
              texture: "Metallic matte finishes and reflective glass",
              motionLanguage: "Fluid cinematic micro-movements",
              typographyDirection: "Bold sans-serif Outfit font",
              negativePrompts: "blurry, low quality, distorted text, ugly faces, bad anatomy",
              consistencyRules: ["Maintain cyan rim light across all indoor shots"]
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 230, generationTime: 110, cost: 0.0018 }
          };
        } else {
          return {
            content: JSON.stringify({
              requiresHumanCharacters: true,
              requiresPersistentAssets: true,
              characters: [
                {
                  characterId: "char-host-1",
                  name: "Alex Vance",
                  role: "expert",
                  appearance: { gender: "male", ageRange: "30-35", ethnicity: "South Asian", clothing: "Navy blazer over charcoal crewneck", hairStyleColor: "Short neat black hair", facialFeatures: "Sharp jawline", bodyCharacteristics: "Athletic" },
                  voiceTraits: { gender: "male", age: "32", accent: "Clear Indian English", tone: "authoritative" },
                  personality: "Visionary tech lead",
                  behavior: "Maintains direct eye contact",
                  referencePrompt: "30yo male tech innovator, navy blazer, photorealistic lighting",
                  negativePrompt: "casual streetwear, messy hair",
                  continuityRules: ["Always wear navy blazer"]
                }
              ],
              assets: [
                {
                  assetId: "asset-hero-1",
                  name: "Uplora Analytics Portal UI",
                  category: "ui_element",
                  appearance: "Dark mode analytics dashboard UI",
                  materials: ["Corning Gorilla Glass"],
                  colors: ["#0F172A", "#3B82F6"],
                  referencePrompt: "Dark mode AI dashboard UI on glass smartphone screen",
                  continuityRules: ["Use blue accents"]
                }
              ]
            }),
            metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 270, generationTime: 120, cost: 0.002 }
          };
        }
      })
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
        { provide: AIEngineService, useValue: mockAiEngine },
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
  });

  it("should execute the full 8-stage Phase 2 pipeline and pass all acceptance criteria", async () => {
    await orchestrator.startProduction(savedProject.id);

    // 1. Completion & Stage status
    expect(savedProject.currentStage).toBe(VideoStage.COMPLETED);
    expect(savedProject.overallProgressPercent).toBe(100);

    // 2. Concept Validation
    expect(savedProject.concept).toBeDefined();
    const validatedConcept = CreativeConceptSchema.parse(savedProject.concept);
    expect(validatedConcept.title).toContain("Industrial Digital Transformation");
    expect(validatedConcept.duration).toBe(30);

    // 3. Research Validation
    expect(savedProject.research).toBeDefined();
    expect(savedProject.research.status).toBe("AVAILABLE");

    // 4. Strategy & Script Validation
    expect(savedProject.script).toBeDefined();
    const validatedStrategy = StrategyBlueprintSchema.parse(savedProject.script.strategy);
    expect(validatedStrategy.hook).toContain("92% of industrial buyers");

    const validatedScript = ScriptDocumentSchema.parse(savedProject.script.script);
    expect(validatedScript.scenes).toHaveLength(4);
    const totalScriptDuration = validatedScript.scenes.reduce((sum, sc) => sum + sc.suggestedDurationSec, 0);
    expect(totalScriptDuration).toBe(30);

    // 5. Storyboard Validation
    expect(savedProject.storyboard).toBeDefined();
    const validatedStoryboard = StoryboardSchema.parse(savedProject.storyboard);
    expect(validatedStoryboard.shots).toHaveLength(4);
    expect(savedShots).toHaveLength(4);

    // 6. Visual Bible Validation
    expect(savedProject.visualBible).toBeDefined();
    const validatedVisualBible = VisualBibleSchema.parse(savedProject.visualBible.visualBible);
    expect(validatedVisualBible.colorPalette.primaryHex).toBe("#0F172A");

    // 7. Deliverable Versioning Records
    expect(recordedVersions.length).toBeGreaterThanOrEqual(7);

    // 8. WebSocket Event Emission
    expect(emittedEvents.length).toBeGreaterThan(0);
    const completedEvent = emittedEvents.find((e) => e.event === "production.completed");
    expect(completedEvent).toBeDefined();
  });
});
