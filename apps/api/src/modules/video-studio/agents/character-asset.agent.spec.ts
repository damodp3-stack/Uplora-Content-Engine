import { CharacterAssetAgent } from "./character-asset.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("CharacterAssetAgent", () => {
  let agent: CharacterAssetAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          requiresHumanCharacters: true,
          requiresPersistentAssets: true,
          characters: [
            {
              characterId: "char-host-1",
              name: "Alex Vance",
              role: "expert",
              appearance: { gender: "male", ageRange: "30-35", ethnicity: "South Asian", clothing: "Navy blazer", hairStyleColor: "Black hair", facialFeatures: "Sharp jawline", bodyCharacteristics: "Athletic" },
              voiceTraits: { gender: "male", age: "32", accent: "Indian English", tone: "authoritative" },
              personality: "Visionary tech lead",
              behavior: "Direct eye contact",
              referencePrompt: "30yo tech innovator, navy blazer",
              negativePrompt: "casual streetwear, messy hair",
              continuityRules: ["Always wear navy blazer"]
            }
          ],
          assets: [
            {
              assetId: "asset-hero-1",
              name: "Uplora Dashboard UI",
              category: "ui_element",
              appearance: "Dark mode analytics UI",
              materials: ["OLED glass"],
              colors: ["#0F172A", "#3B82F6"],
              referencePrompt: "Dark mode AI dashboard UI on glass smartphone screen",
              continuityRules: ["Use blue accents"]
            }
          ]
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 260, generationTime: 120, cost: 0.002, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new CharacterAssetAgent(mockAiEngine as AIEngineService);
  });

  it("should dynamically generate character and asset profiles", async () => {
    const concept: any = { title: "Industrial Web" };
    const visualBible: any = { artDirection: "Cinematic Industrial Tech" };
    const storyboard: any = { shots: [{ shotNumber: 1, visualDescription: "Host talking to camera" }] };

    const packageResult = await agent.generateProfiles(concept, visualBible, storyboard);
    expect(packageResult).toBeDefined();
    expect(packageResult.characters).toHaveLength(1);
    expect(packageResult.assets).toHaveLength(1);
    expect(packageResult.characters[0].name).toBe("Alex Vance");
  });
});
