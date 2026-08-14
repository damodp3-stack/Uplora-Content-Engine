import { ContentStrategistAgent } from "./content-strategist.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("ContentStrategistAgent", () => {
  let agent: ContentStrategistAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          coreMessage: "Your website is your 24/7 industrial sales representative.",
          hook: "92% of industrial buyers check your website before calling sales.",
          hookAlternatives: ["Why your million-dollar factory is losing deals to a $5k website."],
          narrativeStructure: "Problem -> Agitation -> Solution -> CTA",
          emotionalAngle: "Urgency and competitive advantage",
          pacingStrategy: "fast",
          cta: { type: "link_in_bio", text: "Link in bio to audit your industrial digital ROI." },
          audiencePsychology: "Triggers fear of losing market share to modern competitors.",
          retentionStrategy: "Visual contrast between old blueprint and modern digital UI.",
          visualStorytellingStrategy: "Pattern interrupt at second 3 with glowing UI.",
          platformStrategy: "Optimized for Instagram Reels 9:16 vertical feed."
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 200, generationTime: 110, cost: 0.0015, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new ContentStrategistAgent(mockAiEngine as AIEngineService);
  });

  it("should generate a StrategyBlueprintDTO dynamically", async () => {
    const concept: any = {
      title: "Why Industrial Companies Need Modern Websites",
      objective: "Drive website audits",
      targetAudience: { persona: "B2B Execs", painPoints: ["Lost leads"] },
      duration: 30,
      platform: "instagram_reels"
    };

    const strategy = await agent.buildStrategy(concept);
    expect(strategy).toBeDefined();
    expect(strategy.hook).toContain("92% of industrial buyers");
    expect(strategy.cta.text).toContain("Link in bio");
  });
});
