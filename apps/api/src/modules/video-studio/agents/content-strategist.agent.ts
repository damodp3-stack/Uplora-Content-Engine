import { Injectable, Logger } from "@nestjs/common";
import { CreativeConceptDTO } from "./creative-director.agent";

export interface StrategyBlueprintDTO {
  targetDurationSec: number;
  hookType:
    | "question"
    | "surprising_stat"
    | "bold_claim"
    | "problem_first"
    | "visual_pattern_interrupt";
  hookText: string;
  pacing: "fast" | "moderate" | "dramatic";
  viralTriggers: string[];
  ctaType: "comment" | "save" | "share" | "link_in_bio";
  ctaText: string;
}

@Injectable()
export class ContentStrategistAgent {
  private readonly logger = new Logger(ContentStrategistAgent.name);

  async buildStrategy(
    concept: CreativeConceptDTO,
    targetDuration: number = 30,
  ): Promise<StrategyBlueprintDTO> {
    this.logger.log(`Building content strategy for concept: ${concept.title}`);

    return {
      targetDurationSec: targetDuration,
      hookType: "surprising_stat",
      hookText: `92% of buyers check your website before closing a deal. Here is why yours might be costing you millions.`,
      pacing: "fast",
      viralTriggers: ["FOMO", "High ROI proof", "Industry secret"],
      ctaType: "link_in_bio",
      ctaText: "Link in bio to calculate your digital ROI score today.",
    };
  }
}
