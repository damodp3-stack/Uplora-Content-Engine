import { VisualDirectorAgent } from "./visual-director.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("VisualDirectorAgent", () => {
  let agent: VisualDirectorAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          artDirection: "Cinematic Industrial Tech",
          visualStyle: "Photorealistic 35mm anamorphic style",
          colorPalette: { primaryHex: "#0F172A", secondaryHex: "#3B82F6", accentHex: "#10B981", backgroundHex: "#020617", neutralHex: "#64748B" },
          lighting: "Dramatic moody volumetric lighting",
          cameraLanguage: "Smooth tracking movement",
          lensStyle: "35mm anamorphic prime lens, f/1.8",
          compositionRules: ["Rule of thirds", "Leading lines"],
          environmentStyle: "Modern automation facility",
          texture: "Metallic matte finishes",
          motionLanguage: "Fluid 60fps micro-movements",
          typographyDirection: "Bold Outfit font with cyan highlight",
          negativePrompts: "blurry, low quality, distorted text, ugly faces",
          consistencyRules: ["Maintain cyan rim lighting across all shots"]
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 220, generationTime: 100, cost: 0.0018, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new VisualDirectorAgent(mockAiEngine as AIEngineService);
  });

  it("should generate a VisualBibleDTO dynamically", async () => {
    const concept: any = { title: "Industrial Web", creativeDirection: "Moody tech", platform: "instagram_reels" };
    const visualBible = await agent.createVisualBible(concept);
    expect(visualBible).toBeDefined();
    expect(visualBible.colorPalette.primaryHex).toBe("#0F172A");
    expect(visualBible.negativePrompts).toContain("blurry");
  });
});
