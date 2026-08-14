import { z } from "zod";

export const CreativeConceptSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  targetAudience: z.object({
    persona: z.string().min(1),
    painPoints: z.array(z.string()),
    desiredOutcome: z.string().min(1),
  }),
  narrativeAngle: z.string().min(1),
  contentFormat: z.string().min(1),
  platform: z.string().min(1),
  duration: z.number().positive(),
  language: z.string().min(1),
  tone: z.string().min(1),
  hookStrategy: z.string().min(1),
  creativeDirection: z.string().min(1),
});

export type CreativeConceptDTO = z.infer<typeof CreativeConceptSchema>;

export const ClaimClassificationSchema = z.enum([
  "SUPPORTED_FACT",
  "CREATIVE_CLAIM",
  "UNVERIFIED_CLAIM",
  "BRAND_CLAIM",
]);

export type ClaimClassificationDTO = z.infer<typeof ClaimClassificationSchema>;

export const ResearchItemSchema = z.object({
  category: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        const v = val.toLowerCase().trim();
        if (v.includes("audience") || v.includes("insight") || v.includes("persona") || v.includes("target")) return "audience_insight";
        if (v.includes("market") || v.includes("industry") || v.includes("context") || v.includes("overview")) return "market_context";
        if (v.includes("term") || v.includes("jargon") || v.includes("vocabulary") || v.includes("key")) return "terminology";
        if (v.includes("competitor") || v.includes("pattern") || v.includes("trend")) return "competitor_pattern";
        if (v.includes("fact") || v.includes("stat") || v.includes("metric")) return "fact";
        if (v.includes("evidence") || v.includes("proof") || v.includes("data")) return "evidence";
        if (v.includes("uncertainty") || v.includes("risk") || v.includes("gap")) return "uncertainty";
      }
      return "audience_insight";
    },
    z.enum([
      "fact",
      "audience_insight",
      "market_context",
      "terminology",
      "competitor_pattern",
      "evidence",
      "uncertainty",
    ]),
  ),
  claim: z.string().min(1),
  source: z.string().min(1),
  confidence: z.enum(["high", "medium", "low"]).default("high"),
  claimType: ClaimClassificationSchema.default("CREATIVE_CLAIM"),
});

export const ResearchSchema = z.object({
  status: z.enum(["AVAILABLE", "RESEARCH_UNAVAILABLE"]),
  summary: z.string(),
  insights: z.array(ResearchItemSchema),
  terminology: z.array(z.string()),
  collectedAt: z.string(),
  provider: z.string(),
});

export type ResearchDTO = z.infer<typeof ResearchSchema>;

export const StrategyBlueprintSchema = z.object({
  coreMessage: z.string().min(1),
  hook: z.string().min(1),
  hookAlternatives: z.array(z.string()).min(1),
  narrativeStructure: z.string().min(1),
  emotionalAngle: z.string().min(1),
  pacingStrategy: z.enum(["fast", "moderate", "dramatic", "dynamic"]),
  cta: z.object({
    type: z.string().min(1),
    text: z.string().min(1),
  }),
  audiencePsychology: z.string().min(1),
  retentionStrategy: z.string().min(1),
  visualStorytellingStrategy: z.string().min(1),
  platformStrategy: z.string().min(1),
});

export type StrategyBlueprintDTO = z.infer<typeof StrategyBlueprintSchema>;

export const SceneSchema = z.object({
  sceneIndex: z.number().int().positive(),
  suggestedDurationSec: z.number().positive(),
  sceneIntent: z.string().min(1),
  narration: z.string().min(1),
  dialogue: z.string().optional(),
  onScreenText: z.string().optional(),
  ctaText: z.string().optional(),
  pacing: z.string().min(1),
  emotionalDelivery: z.string().min(1),
  pronunciationNotes: z.array(z.string()).optional(),
});

export const ScriptDocumentSchema = z.object({
  title: z.string().min(1),
  estimatedDurationSec: z.number().positive(),
  language: z.object({
    script: z.string(),
    voice: z.string(),
    subtitles: z.string(),
  }),
  scenes: z.array(SceneSchema).min(1),
  fullNarrationText: z.string().optional().default(""),
  wordCount: z.number().int().nonnegative().optional().default(0),
  wordsPerMinute: z.number().positive().optional().default(145),
  estimatedSpeechDurationMs: z.number().nonnegative().optional().default(30000),
  targetDurationMs: z.number().positive().optional().default(30000),
  timingVarianceMs: z.number().optional().default(0),
  timingStatus: z.enum(["TIMING_VALIDATED", "TIMING_VALIDATION_FAILED"]).optional().default("TIMING_VALIDATED"),
});

export type ScriptDocumentDTO = z.infer<typeof ScriptDocumentSchema>;

export const ShotSchema = z.object({
  shotNumber: z.number().int().positive(),
  durationSec: z.number().positive(),
  purpose: z.string().min(1),
  visualDescription: z.string().min(1),
  cameraAngle: z.string().min(1),
  cameraMovement: z.string().min(1),
  composition: z.string().min(1),
  subjectAction: z.string().min(1),
  environment: z.string().min(1),
  transition: z.string().min(1),
  narrationReference: z.string().min(1),
  onScreenText: z.string().optional(),
  sfxIntention: z.string().optional(),
  musicIntention: z.string().optional(),
  generationPrompt: z.string().min(1),
  continuityRequirements: z.string().optional(),
  characterReferences: z.array(z.string()).optional(),
});

export const StoryboardSchema = z.object({
  totalShots: z.number().int().positive(),
  estimatedTotalDurationSec: z.number().positive(),
  shots: z.array(ShotSchema).min(1),
});

export type StoryboardDTO = z.infer<typeof StoryboardSchema>;

export const ColorPaletteSchema = z.object({
  primaryHex: z.string().min(4),
  secondaryHex: z.string().min(4),
  accentHex: z.string().min(4),
  backgroundHex: z.string().min(4),
  neutralHex: z.string().min(4),
});

export const VisualBibleSchema = z.object({
  artDirection: z.string().min(1),
  visualStyle: z.string().min(1),
  colorPalette: ColorPaletteSchema,
  lighting: z.string().min(1),
  cameraLanguage: z.string().min(1),
  lensStyle: z.string().min(1),
  compositionRules: z.array(z.string()).min(1),
  environmentStyle: z.string().min(1),
  texture: z.string().min(1),
  motionLanguage: z.string().min(1),
  typographyDirection: z.string().min(1),
  negativePrompts: z.string().min(1),
  consistencyRules: z.array(z.string()).min(1),
});

export type VisualBibleDTO = z.infer<typeof VisualBibleSchema>;

export const CharacterProfileSchema = z.object({
  characterId: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  appearance: z.object({
    gender: z.string(),
    ageRange: z.string(),
    ethnicity: z.string(),
    clothing: z.string(),
    hairStyleColor: z.string(),
    facialFeatures: z.string(),
    bodyCharacteristics: z.string(),
  }),
  voiceTraits: z.object({
    gender: z.string(),
    age: z.string(),
    accent: z.string(),
    tone: z.string(),
  }),
  personality: z.string(),
  behavior: z.string(),
  referencePrompt: z.string(),
  negativePrompt: z.string(),
  continuityRules: z.array(z.string()),
});

export type CharacterProfileDTO = z.infer<typeof CharacterProfileSchema>;

export const AssetProfileSchema = z.object({
  assetId: z.string().min(1),
  name: z.string().min(1),
  category: z.enum([
    "product",
    "vehicle",
    "environment",
    "prop",
    "logo",
    "ui_element",
  ]),
  appearance: z.string().min(1),
  dimensionsOrProportions: z.string().optional(),
  materials: z.array(z.string()),
  colors: z.array(z.string()),
  brandingDetails: z.string().optional(),
  referencePrompt: z.string().min(1),
  continuityRules: z.array(z.string()),
});

export type AssetProfileDTO = z.infer<typeof AssetProfileSchema>;

export const CharacterAssetPackageSchema = z.object({
  requiresHumanCharacters: z.boolean(),
  requiresPersistentAssets: z.boolean(),
  characters: z.array(CharacterProfileSchema),
  assets: z.array(AssetProfileSchema),
});

export type CharacterAssetPackageDTO = z.infer<
  typeof CharacterAssetPackageSchema
>;

export const QualityEvaluationSchema = z.object({
  humanNaturalnessScore: z.number().min(0).max(100),
  genericAIScore: z.number().min(0).max(100),
  claimSafetyScore: z.number().min(0).max(100),
  visualNarrativeScore: z.number().min(0).max(100),
  productionFeasibilityScore: z.number().min(0).max(100),
  blueprintQualityScore: z.number().min(0).max(100),
  productionReadinessScore: z.number().min(0).max(100),
  feedback: z.object({
    humanNaturalness: z.string(),
    genericAI: z.string(),
    claimSafety: z.string(),
    visualNarrative: z.string(),
    productionFeasibility: z.string(),
    productionReadiness: z.string(),
  }),
});

export type QualityEvaluationDTO = z.infer<typeof QualityEvaluationSchema>;
