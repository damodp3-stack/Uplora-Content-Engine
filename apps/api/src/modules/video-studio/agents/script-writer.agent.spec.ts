import { ScriptWriterAgent } from "./script-writer.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("ScriptWriterAgent", () => {
  let agent: ScriptWriterAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          title: "Industrial Web Strategy",
          estimatedDurationSec: 30,
          language: { script: "english", voice: "english", subtitles: "english" },
          scenes: [
            { sceneIndex: 1, suggestedDurationSec: 5.0, sceneIntent: "hook", narration: "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative.", pacing: "fast", emotionalDelivery: "authoritative" },
            { sceneIndex: 2, suggestedDurationSec: 8.0, sceneIntent: "problem", narration: "If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts.", pacing: "moderate", emotionalDelivery: "serious" },
            { sceneIndex: 3, suggestedDurationSec: 12.0, sceneIntent: "solution", narration: "Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies.", pacing: "energetic", emotionalDelivery: "inspiring" },
            { sceneIndex: 4, suggestedDurationSec: 5.0, sceneIntent: "cta", narration: "Click the link in our bio right now to audit your industrial digital ROI score today.", pacing: "fast", emotionalDelivery: "persuasive" }
          ],
          fullNarrationText: "Most industrial decision makers perform extensive online research long before ever reaching out to a sales representative. If your website appears outdated, potential clients assume your manufacturing capabilities are behind the times, losing high-value contracts. Uplora transforms your web presence into a 24/7 automated lead generation portal, highlighting precision engineering, certifications, and portfolio case studies. Click the link in our bio right now to audit your industrial digital ROI score today.",
          wordCount: 71
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 250, generationTime: 130, cost: 0.002, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new ScriptWriterAgent(mockAiEngine as AIEngineService);
  });

  it("should write a dynamic timed script matching target duration", async () => {
    const concept: any = { title: "Industrial Web Strategy", duration: 30, language: "english" };
    const strategy: any = { hook: "92% of buyers", coreMessage: "Website sells 24/7", cta: { text: "Link in bio" } };

    const scriptDoc = await agent.writeScript(concept, strategy);
    expect(scriptDoc).toBeDefined();
    expect(scriptDoc.scenes).toHaveLength(4);
    const totalDuration = scriptDoc.scenes.reduce((acc, s) => acc + s.suggestedDurationSec, 0);
    expect(totalDuration).toBe(30);
  });
});
