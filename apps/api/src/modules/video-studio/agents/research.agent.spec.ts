import { ResearchAgent } from "./research.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("ResearchAgent", () => {
  let agent: ResearchAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          status: "AVAILABLE",
          summary: "Industrial decision makers evaluate suppliers online prior to outreach.",
          insights: [
            { category: "audience_insight", claim: "80% of industrial buyers avoid suppliers without digital specs", source: "B2B Buyer Report 2026", confidence: "high" }
          ],
          terminology: ["Lead Time", "RFQ Automation", "Digital Twin"],
          collectedAt: new Date().toISOString(),
          provider: "openai"
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 150, generationTime: 90, cost: 0.001, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new ResearchAgent(mockAiEngine as AIEngineService);
  });

  it("should return RESEARCH_UNAVAILABLE if no provider & fallback is disabled", async () => {
    const result = await agent.collectResearch("Industrial website", "B2B Executives", false);
    expect(result.status).toBe("RESEARCH_UNAVAILABLE");
    expect(result.insights).toHaveLength(0);
  });

  it("should collect research context via AIEngine fallback when allowed", async () => {
    const result = await agent.collectResearch("Industrial website", "B2B Executives", true);
    expect(result.status).toBe("AVAILABLE");
    expect(result.insights).toHaveLength(1);
    expect(result.terminology).toContain("RFQ Automation");
  });
});
