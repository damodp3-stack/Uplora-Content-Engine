import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  CreativeConceptDTO,
  ResearchDTO,
  StrategyBlueprintDTO,
  StrategyBlueprintSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { STRATEGIST_PROMPT } from "../prompts/strategist.prompt";

@Injectable()
export class ContentStrategistAgent {
  private readonly logger = new Logger(ContentStrategistAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async buildStrategy(
    concept: CreativeConceptDTO,
    research?: ResearchDTO,
  ): Promise<StrategyBlueprintDTO> {
    this.logger.log(`Building dynamic Content Strategy for concept: "${concept.title}"`);

    const userPrompt = STRATEGIST_PROMPT.buildUserPrompt({
      conceptTitle: concept.title,
      objective: concept.objective,
      persona: concept.targetAudience.persona,
      painPoints: concept.targetAudience.painPoints,
      duration: concept.duration,
      platform: concept.platform,
    });

    const result = await executeLLMAgent<StrategyBlueprintDTO>(
      this.aiEngine,
      STRATEGIST_PROMPT.systemInstructions,
      userPrompt,
      StrategyBlueprintSchema,
      this.logger,
      ContentStrategistAgent.name,
      STRATEGIST_PROMPT.version,
    );

    return result.data;
  }
}
