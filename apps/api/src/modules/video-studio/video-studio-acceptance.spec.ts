import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
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
import {
  CreativeConceptSchema,
  StrategyBlueprintSchema,
  ScriptDocumentSchema,
  StoryboardSchema,
  VisualBibleSchema,
  QualityEvaluationSchema,
} from "./schemas/phase2-deliverables.schema";

describe("Phase 2 End-to-End Acceptance Test Scenario", () => {
  let orchestrator: VideoProductionOrchestrator;
  let savedProject: VideoProject;
  let recordedVersions: any[] = [];
  let savedShots: any[] = [];
  let emittedEvents: Array<{ room: string; event: string; payload: any }> = [];

  const rawPrompt =
    "Create a 30 second Instagram Reel for Uplora explaining why industrial companies need a professional website.";

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
      updatedAt: new Date(),
    } as any;

    const mockAiEngine = {
      generateContent: jest.fn().mockImplementation(async (req) => {
        const fullPromptText = `${req.prompt} ${req.templateVariables?.systemPrompt || ""}`.toLowerCase();

        if (fullPromptText.includes("master creative director") || fullPromptText.includes("analyze this video idea")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation: Why Modern Web Presence Wins Deals",
              objective:
                "Educate industrial business leaders on automated lead acquisition via digital portals.",
              targetAudience: {
                persona: "Industrial Operations Directors & VP of Sales",
                painPoints: [
                  "High customer acquisition costs",
                  "Reliance on trade shows",
                  "Slow quote turnaround",
                ],
                desiredOutcome:
                  "Automate inbound quote generation and build high authority trust.",
              },
              narrativeAngle:
                "Problem-Agitation-Solution: Factory Floor to Digital Portal",
              contentFormat: "instagram_reels",
              platform: "instagram_reels",
              duration: 30,
              language: "english",
              tone: "authoritative",
              hookStrategy:
                "Stat interrupt: Most B2B buyers audit websites before issuing an RFQ.",
              creativeDirection:
                "Cinematic industrial tech aesthetic with glowing cyan lighting.",
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 300,
              generationTime: 120,
              cost: 0.002,
            },
          };
        } else if (fullPromptText.includes("industry researcher") || fullPromptText.includes("research relevant context")) {
          return {
            content: JSON.stringify({
              status: "AVAILABLE",
              summary:
                "Industrial procurement has shifted to online research prior to sales representative contact.",
              insights: [
                {
                  category: "audience_insight",
                  claim:
                    "Industrial buyers perform digital due diligence prior to issuing RFQs.",
                  source: "Industrial B2B Report 2026",
                  confidence: "high",
                  claimType: "SUPPORTED_FACT",
                },
              ],
              terminology: ["RFQ", "CAD Spec", "Digital Twin"],
              collectedAt: new Date().toISOString(),
              provider: "gemini",
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 150,
              generationTime: 80,
              cost: 0.001,
            },
          };
        } else if (fullPromptText.includes("lead content strategist") || fullPromptText.includes("content strategy blueprint")) {
          return {
            content: JSON.stringify({
              coreMessage:
                "Your industrial website is your top 24/7 sales representative.",
              hook: "Most industrial buyers check your website before ever reaching out for an RFQ.",
              hookAlternatives: [
                "Is your manufacturing factory losing high value contracts due to an outdated website?",
              ],
              narrativeStructure:
                "Hook -> Industrial Agitation -> Digital Solution -> CTA",
              emotionalAngle: "Urgency and competitive authority",
              pacingStrategy: "moderate",
              cta: {
                type: "link_in_bio",
                text: "Link in bio to calculate your industrial digital ROI.",
              },
              audiencePsychology:
                "Triggers fear of missing out on high-margin automated RFQs.",
              retentionStrategy:
                "Visual pattern interrupt at second 3 with high-contrast UI overlay.",
              visualStorytellingStrategy:
                "Cinematic factory drone shots shifting to crisp digital UI.",
              platformStrategy: "Optimized for Instagram Reels vertical 9:16 feed.",
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 210,
              generationTime: 100,
              cost: 0.0015,
            },
          };
        } else if (fullPromptText.includes("video scriptwriter") || fullPromptText.includes("timed 30-second script")) {
          return {
            content: JSON.stringify({
              title: "Industrial Digital Transformation",
              estimatedDurationSec: 30,
              language: {
                script: "english",
                voice: "english",
                subtitles: "english",
              },
              scenes: [
                {
                  sceneIndex: 1,
                  suggestedDurationSec: 5.0,
                  sceneIntent: "hook",
                  narration:
                    "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative.",
                  pacing: "moderate",
                  emotionalDelivery: "authoritative",
                },
                {
                  sceneIndex: 2,
                  suggestedDurationSec: 8.0,
                  sceneIntent: "problem",
                  narration:
                    "If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts.",
                  pacing: "serious",
                  emotionalDelivery: "serious",
                },
                {
                  sceneIndex: 3,
                  suggestedDurationSec: 12.0,
                  sceneIntent: "solution",
                  narration:
                    "Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies.",
                  pacing: "energetic",
                  emotionalDelivery: "inspiring",
                },
                {
                  sceneIndex: 4,
                  suggestedDurationSec: 5.0,
                  sceneIntent: "cta",
                  narration:
                    "Click the link in our bio right now to audit your industrial digital ROI score today.",
                  pacing: "fast",
                  emotionalDelivery: "persuasive",
                },
              ],
              fullNarrationText:
                "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative. If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts. Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies. Click the link in our bio right now to audit your industrial digital ROI score today.",
              wordCount: 71,
              wordsPerMinute: 145,
              estimatedSpeechDurationMs: 29379,
              targetDurationMs: 30000,
              timingVarianceMs: -621,
              timingStatus: "TIMING_VALIDATED",
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 280,
              generationTime: 130,
              cost: 0.002,
            },
          };
        } else if (fullPromptText.includes("storyboard director") || fullPromptText.includes("shot-by-shot storyboard")) {
          return {
            content: JSON.stringify({
              totalShots: 4,
              estimatedTotalDurationSec: 30,
              shots: [
                {
                  shotNumber: 1,
                  durationSec: 5.0,
                  purpose: "hook",
                  visualDescription:
                    "Sleek industrial plant skyline at dusk with glowing cyan lights",
                  cameraAngle: "low_angle",
                  cameraMovement: "push_in",
                  composition: "rule of thirds",
                  subjectAction: "High-tech robotic arm operating seamlessly",
                  environment: "Modern automated plant",
                  transition: "cut",
                  narrationReference:
                    "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative.",
                  generationPrompt:
                    "9:16 vertical shot, 8k resolution, cinematic industrial factory",
                  characterReferences: ["char-host-1"],
                },
                {
                  shotNumber: 2,
                  durationSec: 8.0,
                  purpose: "problem",
                  visualDescription:
                    "Close up of frustrated executive looking at slow loading legacy website on desktop monitor",
                  cameraAngle: "eye_level",
                  cameraMovement: "static",
                  composition: "centered framing",
                  subjectAction: "Executive rubbing forehead",
                  environment: "Dim office",
                  transition: "whip_pan",
                  narrationReference:
                    "If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts.",
                  generationPrompt:
                    "9:16 vertical shot, moody lighting executive office",
                  characterReferences: ["char-host-1"],
                },
                {
                  shotNumber: 3,
                  durationSec: 12.0,
                  purpose: "solution",
                  visualDescription:
                    "Futuristic Uplora digital analytics portal UI glowing on smartphone glass display",
                  cameraAngle: "high_angle",
                  cameraMovement: "pan_right",
                  composition: "diagonal leading lines",
                  subjectAction: "Lead count increments in real time",
                  environment: "Minimalist studio",
                  transition: "zoom_blur",
                  narrationReference:
                    "Uplora transforms your web presence into a 24/7 automated lead generation portal...",
                  generationPrompt:
                    "9:16 vertical shot, 3d analytics dashboard UI screen",
                  characterReferences: [],
                },
                {
                  shotNumber: 4,
                  durationSec: 5.0,
                  purpose: "cta",
                  visualDescription:
                    "Uplora logo animation with prominent CTA button",
                  cameraAngle: "eye_level",
                  cameraMovement: "push_in",
                  composition: "centered",
                  subjectAction: "Button pulse animation",
                  environment: "Branded studio backdrop",
                  transition: "fade",
                  narrationReference:
                    "Click the link in our bio right now to audit your industrial digital ROI score today.",
                  generationPrompt: "9:16 vertical shot, Uplora logo animation",
                  characterReferences: [],
                },
              ],
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 350,
              generationTime: 150,
              cost: 0.0025,
            },
          };
        } else if (
          fullPromptText.includes("visual effects director") ||
          fullPromptText.includes("production designer") ||
          fullPromptText.includes("develop a visual bible")
        ) {
          return {
            content: JSON.stringify({
              artDirection: "Cinematic Industrial Tech",
              visualStyle:
                "Photorealistic 35mm anamorphic style with high contrast and cyan accents",
              colorPalette: {
                primaryHex: "#0F172A",
                secondaryHex: "#3B82F6",
                accentHex: "#10B981",
                backgroundHex: "#020617",
                neutralHex: "#64748B",
              },
              lighting: "Dramatic volumetric cyan and amber rim lighting",
              cameraLanguage: "Smooth 60fps tracking motion",
              lensStyle:
                "35mm anamorphic prime lens, shallow depth of field f/1.8",
              compositionRules: [
                "Rule of thirds",
                "Vertical center alignment",
              ],
              environmentStyle: "Modern automated industrial facility",
              texture: "Metallic matte finishes and reflective glass",
              motionLanguage: "Fluid cinematic micro-movements",
              typographyDirection: "Bold sans-serif Outfit font",
              negativePrompts:
                "blurry, low quality, distorted text, ugly faces, bad anatomy",
              consistencyRules: [
                "Maintain cyan rim light across all indoor shots",
              ],
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 230,
              generationTime: 110,
              cost: 0.0018,
            },
          };
        } else if (fullPromptText.includes("quality auditor") || fullPromptText.includes("evaluate the creative quality")) {
          return {
            content: JSON.stringify({
              humanNaturalnessScore: 92,
              genericAIScore: 95,
              claimSafetyScore: 100,
              visualNarrativeScore: 90,
              productionFeasibilityScore: 94,
              blueprintQualityScore: 94,
              productionReadinessScore: 0,
              feedback: {
                humanNaturalness: "Conversational, highly persuasive marketing voice.",
                genericAI: "Free of AI clichés and buzzwords.",
                claimSafety: "100% claim safety verified.",
                visualNarrative: "Distinct, engaging 9:16 vertical shots.",
                productionFeasibility: "Highly feasible for AI video generation.",
                productionReadiness: "Media assets not generated yet (Phase 2 blueprint only)."
              }
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 250,
              generationTime: 100,
              cost: 0.0015,
            }
          };
        } else if (
          fullPromptText.includes("asset & character pipeline supervisor") ||
          fullPromptText.includes("analyze character and asset requirements")
        ) {
          return {
            content: JSON.stringify({
              requiresHumanCharacters: true,
              requiresPersistentAssets: true,
              characters: [
                {
                  characterId: "char-host-1",
                  name: "Alex Vance",
                  role: "expert",
                  appearance: {
                    gender: "male",
                    ageRange: "30-35",
                    ethnicity: "South Asian",
                    clothing: "Navy blazer over charcoal crewneck",
                    hairStyleColor: "Short neat black hair",
                    facialFeatures: "Sharp jawline",
                    bodyCharacteristics: "Athletic",
                  },
                  voiceTraits: {
                    gender: "male",
                    age: "32",
                    accent: "Clear Indian English",
                    tone: "authoritative",
                  },
                  personality: "Visionary tech lead",
                  behavior: "Maintains direct eye contact",
                  referencePrompt:
                    "30yo male tech innovator, navy blazer, photorealistic lighting",
                  negativePrompt: "casual streetwear, messy hair",
                  continuityRules: ["Always wear navy blazer"],
                },
              ],
              assets: [
                {
                  assetId: "asset-hero-1",
                  name: "Uplora Analytics Portal UI",
                  category: "ui_element",
                  appearance: "Dark mode analytics dashboard UI",
                  materials: ["Corning Gorilla Glass"],
                  colors: ["#0F172A", "#3B82F6"],
                  referencePrompt:
                    "Dark mode AI dashboard UI on glass smartphone screen",
                  continuityRules: ["Use blue accents"],
                },
              ],
            }),
            metadata: {
              provider: "gemini",
              model: "gemini-3.6-flash",
              tokensUsed: 270,
              generationTime: 120,
              cost: 0.002,
            },
          };
        } else {
          throw new Error(`Unhandled mock prompt: ${fullPromptText.substring(0, 100)}...`);
        }
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
            count: jest
              .fn()
              .mockImplementation(async () => recordedVersions.length),
            update: jest
              .fn()
              .mockImplementation(async () => ({ affected: 1 })),
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

    orchestrator = moduleRef.get<VideoProductionOrchestrator>(
      VideoProductionOrchestrator,
    );
  });

  it("should execute the full 8-stage Phase 2 pipeline and pass all acceptance criteria", async () => {
    await orchestrator.startProduction(savedProject.id);

    // 1. Completion & Stage status
    expect(savedProject.currentStage).toBe(VideoStage.COMPLETED);
    expect(savedProject.overallProgressPercent).toBe(100);

    // 2. Concept Validation
    expect(savedProject.concept).toBeDefined();
    const validatedConcept = CreativeConceptSchema.parse(
      savedProject.concept,
    );
    expect(validatedConcept.title).toContain(
      "Industrial Digital Transformation",
    );
    expect(validatedConcept.duration).toBe(30);

    // 3. Research Validation
    expect(savedProject.research).toBeDefined();
    expect(savedProject.research.status).toBe("AVAILABLE");

    // 4. Strategy & Script Validation
    expect(savedProject.script).toBeDefined();
    const validatedStrategy = StrategyBlueprintSchema.parse(
      savedProject.script.strategy,
    );
    expect(validatedStrategy.hook).toBeDefined();

    const validatedScript = ScriptDocumentSchema.parse(
      savedProject.script.script,
    );
    expect(validatedScript.scenes).toHaveLength(4);
    const totalScriptDuration = validatedScript.scenes.reduce(
      (sum, sc) => sum + sc.suggestedDurationSec,
      0,
    );
    expect(totalScriptDuration).toBe(30);

    // Speech timing assertions
    expect(validatedScript.wordCount).toBeGreaterThan(0);
    expect(validatedScript.estimatedSpeechDurationMs).toBeGreaterThan(0);
    expect(validatedScript.timingStatus).toBe("TIMING_VALIDATED");

    // 5. Storyboard Validation
    expect(savedProject.storyboard).toBeDefined();
    const validatedStoryboard = StoryboardSchema.parse(
      savedProject.storyboard,
    );
    expect(validatedStoryboard.shots).toHaveLength(4);
    expect(savedShots).toHaveLength(4);

    // 6. Visual Bible Validation
    expect(savedProject.visualBible).toBeDefined();
    const validatedVisualBible = VisualBibleSchema.parse(
      savedProject.visualBible.visualBible,
    );
    expect(validatedVisualBible.colorPalette.primaryHex).toBe("#0F172A");

    // 7. Quality Evaluation & Production Readiness Separation
    expect(savedProject.visualBible.qualityEvaluation).toBeDefined();
    const validatedQuality = QualityEvaluationSchema.parse(
      savedProject.visualBible.qualityEvaluation,
    );
    expect(validatedQuality.blueprintQualityScore).toBeGreaterThan(0);
    expect(validatedQuality.productionReadinessScore).toBe(0); // STRICT 0 RULE

    // 8. Deliverable Versioning Records
    expect(recordedVersions.length).toBeGreaterThanOrEqual(8);

    // 9. WebSocket Event Emission
    expect(emittedEvents.length).toBeGreaterThan(0);
    const completedEvent = emittedEvents.find(
      (e) => e.event === "production.completed",
    );
    expect(completedEvent).toBeDefined();
  });
});
