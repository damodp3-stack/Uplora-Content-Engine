import { CreativeDirectorAgent } from "./creative-director.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("CreativeDirectorAgent", () => {
  let agent: CreativeDirectorAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          title: "Why Industrial Companies Need Modern Websites",
          objective: "Educate B2B decision makers on revenue loss from outdated digital presence.",
          targetAudience: {
            persona: "Industrial Executives & Operations Directors",
            painPoints: ["High acquisition costs", "Outdated market perception", "Slow lead qualification"],
            desiredOutcome: "Modernize digital presence and automate lead generation"
          },
          narrativeAngle: "Problem-Agitation-Solution Case Study",
          contentFormat: "instagram_reels",
          platform: "instagram_reels",
          duration: 30,
          language: "english",
          tone: "authoritative",
          hookStrategy: "Stat interrupt: 92% of B2B buyers research online before contacting sales",
          creativeDirection: "Cinematic industrial tech style with moody lighting and clean dashboard UI overlay"
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 250, generationTime: 120, cost: 0.002, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new CreativeDirectorAgent(mockAiEngine as AIEngineService);
  });

  it("should develop a valid CreativeConceptDTO via AIEngineService", async () => {
    const concept = await agent.developConcept(
      "Create a 30 second Reel explaining why industrial companies need a website",
      "instagram_reels",
      30,
      "english"
    );

    expect(concept).toBeDefined();
    expect(concept.title).toBe("Why Industrial Companies Need Modern Websites");
    expect(concept.duration).toBe(30);
    expect(concept.targetAudience.painPoints).toHaveLength(3);
    expect(mockAiEngine.generateContent).toHaveBeenCalledTimes(1);
  });
});
