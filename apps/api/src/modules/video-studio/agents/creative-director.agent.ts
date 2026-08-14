import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  CreativeConceptDTO,
  CreativeConceptSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { CREATIVE_DIRECTOR_PROMPT } from "../prompts/creative-director.prompt";

@Injectable()
export class CreativeDirectorAgent {
  private readonly logger = new Logger(CreativeDirectorAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async developConcept(
    rawPrompt: string,
    platform: string = "instagram_reels",
    duration: number = 30,
    language: string = "english",
  ): Promise<CreativeConceptDTO> {
    this.logger.log(
      `Developing Creative Concept via LLM for prompt: "${rawPrompt.substring(0, 60)}"`,
    );

    const userPrompt = CREATIVE_DIRECTOR_PROMPT.buildUserPrompt({
      rawPrompt,
      platform,
      duration,
      language,
    });

    const result = await executeLLMAgent<CreativeConceptDTO>(
      this.aiEngine,
      CREATIVE_DIRECTOR_PROMPT.systemInstructions,
      userPrompt,
      CreativeConceptSchema,
      this.logger,
      CreativeDirectorAgent.name,
      CREATIVE_DIRECTOR_PROMPT.version,
    );

    return result.data;
  }
}
