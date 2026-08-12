import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

export interface CreativeConceptDTO {
  title: string;
  coreObjective: string;
  targetAudience: {
    persona: string;
    painPoints: string[];
    desiredOutcome: string;
  };
  narrativeAngle: string;
  tone:
    | "professional"
    | "energetic"
    | "authoritative"
    | "conversational"
    | "dramatic";
  format: "instagram_reels" | "youtube_shorts" | "tiktok";
  keyMessage: string;
}

@Injectable()
export class CreativeDirectorAgent {
  private readonly logger = new Logger(CreativeDirectorAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async developConcept(
    rawPrompt: string,
    platform: string = "instagram_reels",
  ): Promise<CreativeConceptDTO> {
    this.logger.log(
      `Developing creative concept for prompt: ${rawPrompt.substring(0, 60)}`,
    );

    try {
      const response = await this.aiEngine.generateContent({
        prompt: `Act as a Master Creative Director. Transform this user video idea into a structured Creative Concept for a 9:16 short-form video: "${rawPrompt}". Output clear concept details.`,
        type: "blog_post",
        tone: "authoritative",
        platform,
      });

      return {
        title: this.extractTitle(response.content, rawPrompt),
        coreObjective: `Effectively communicate: ${rawPrompt}`,
        targetAudience: {
          persona: "B2B Decision Makers & Modern Professionals",
          painPoints: [
            "Outdated workflows",
            "High acquisition costs",
            "Lack of digital presence",
          ],
          desiredOutcome: "Modernize tech stack & drive revenue growth",
        },
        narrativeAngle: "Direct Problem-Solution Case Study Hook",
        tone: "conversational",
        format: (platform as any) || "instagram_reels",
        keyMessage: `Uplora enables effortless execution for ${rawPrompt.substring(0, 40)}`,
      };
    } catch (err) {
      this.logger.warn(`Fallback concept used: ${(err as Error).message}`);
      return {
        title:
          rawPrompt.length > 50
            ? `${rawPrompt.substring(0, 50)}...`
            : rawPrompt,
        coreObjective: `Demonstrate value of ${rawPrompt}`,
        targetAudience: {
          persona: "Business Owners & Growth Managers",
          painPoints: ["Scaling bottlenecks", "Slow delivery"],
          desiredOutcome: "Automated growth & efficiency",
        },
        narrativeAngle: "Insightful Industry Breakdown",
        tone: "authoritative",
        format: "instagram_reels",
        keyMessage: "Professional digital strategy drives 10x ROI",
      };
    }
  }

  private extractTitle(content: string, fallback: string): string {
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const titleLine = lines.find(
      (l) => l.startsWith("#") || l.toLowerCase().includes("title:"),
    );
    if (titleLine) {
      return titleLine
        .replace(/^#+\s*/, "")
        .replace(/title:\s*/i, "")
        .trim();
    }
    return fallback.length > 50 ? `${fallback.substring(0, 47)}...` : fallback;
  }
}
