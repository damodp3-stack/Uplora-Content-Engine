import { Injectable, Logger } from "@nestjs/common";
import { CreativeConceptDTO } from "./creative-director.agent";
import { StrategyBlueprintDTO } from "./content-strategist.agent";

export interface ScriptDocumentDTO {
  title: string;
  wordCount: number;
  estimatedDurationSec: number;
  language: {
    script: string;
    voice: string;
    subtitles: string;
  };
  narrationLines: Array<{
    lineIndex: number;
    text: string;
    suggestedDurationSec: number;
    emotion: string;
    emphasisWords: string[];
  }>;
  fullNarrationText: string;
}

@Injectable()
export class ScriptWriterAgent {
  private readonly logger = new Logger(ScriptWriterAgent.name);

  async writeScript(
    concept: CreativeConceptDTO,
    strategy: StrategyBlueprintDTO,
    languages: { script: string; voice: string; subtitles: string },
  ): Promise<ScriptDocumentDTO> {
    this.logger.log(
      `Writing timed script for ${concept.title} (${strategy.targetDurationSec}s target)`,
    );

    const lines = [
      {
        lineIndex: 1,
        text: strategy.hookText,
        suggestedDurationSec: 5.0,
        emotion: "authoritative",
        emphasisWords: ["92%", "website", "millions"],
      },
      {
        lineIndex: 2,
        text: "In 2026, a slow, non-responsive site tells modern clients you are out of touch.",
        suggestedDurationSec: 6.0,
        emotion: "serious",
        emphasisWords: ["out of touch", "slow"],
      },
      {
        lineIndex: 3,
        text: "High-performing companies use modern AI architecture to turn visits into qualified leads automatically.",
        suggestedDurationSec: 8.0,
        emotion: "energetic",
        emphasisWords: ["AI architecture", "qualified leads"],
      },
      {
        lineIndex: 4,
        text: "Uplora transforms your content pipeline into a 24/7 revenue engine.",
        suggestedDurationSec: 6.0,
        emotion: "inspiring",
        emphasisWords: ["Uplora", "revenue engine"],
      },
      {
        lineIndex: 5,
        text: strategy.ctaText,
        suggestedDurationSec: 5.0,
        emotion: "persuasive",
        emphasisWords: ["Link in bio", "today"],
      },
    ];

    const fullText = lines.map((l) => l.text).join(" ");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    return {
      title: concept.title,
      wordCount,
      estimatedDurationSec: strategy.targetDurationSec,
      language: languages,
      narrationLines: lines,
      fullNarrationText: fullText,
    };
  }
}
