import { StoryboardDirectorAgent } from "./storyboard-director.agent";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

describe("StoryboardDirectorAgent", () => {
  let agent: StoryboardDirectorAgent;
  let mockAiEngine: Partial<AIEngineService>;

  beforeEach(() => {
    mockAiEngine = {
      generateContent: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          totalShots: 2,
          estimatedTotalDurationSec: 30,
          shots: [
            {
              shotNumber: 1,
              durationSec: 5.0,
              purpose: "hook",
              visualDescription: "Sleek industrial plant at dusk with glowing neon lights",
              cameraAngle: "low_angle",
              cameraMovement: "push_in",
              composition: "rule of thirds",
              subjectAction: "Robotic arm moves in slow motion",
              environment: "Modern factory floor",
              transition: "cut",
              narrationReference: "92% of industrial buyers check your site first.",
              generationPrompt: "9:16 vertical video shot, 8k resolution, cinematic industrial plant",
              sfxIntention: "whoosh_bass",
              musicIntention: "upbeat tech"
            },
            {
              shotNumber: 2,
              durationSec: 25.0,
              purpose: "solution",
              visualDescription: "Uplora dashboard on smartphone",
              cameraAngle: "eye_level",
              cameraMovement: "static",
              composition: "centered framing",
              subjectAction: "User taps CTA button",
              environment: "Minimalist desk",
              transition: "fade",
              narrationReference: "Uplora turns visitors into leads 24/7.",
              generationPrompt: "9:16 vertical video shot, high tech smartphone screen UI",
              sfxIntention: "subtle click",
              musicIntention: "inspiring synth"
            }
          ]
        }),
        metadata: { provider: "openai", model: "gpt-4o", tokensUsed: 300, generationTime: 140, cost: 0.002, promptVersion: "2.0.0" },
        suggestions: { titles: [], hashtags: [], keywords: [], cta: [] }
      })
    };
    agent = new StoryboardDirectorAgent(mockAiEngine as AIEngineService);
  });

  it("should create a dynamic StoryboardDTO from script scenes", async () => {
    const scriptDoc: any = {
      title: "Industrial Web Strategy",
      estimatedDurationSec: 30,
      scenes: [{ sceneIndex: 1, suggestedDurationSec: 5.0, narration: "92% of buyers", sceneIntent: "hook" }]
    };

    const storyboard = await agent.createStoryboard(scriptDoc);
    expect(storyboard).toBeDefined();
    expect(storyboard.shots).toHaveLength(2);
    expect(storyboard.shots[0].generationPrompt).toContain("9:16 vertical video shot");
  });
});
