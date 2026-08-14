import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  CreativeConceptDTO,
  VisualBibleDTO,
  VisualBibleSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { VISUAL_DIRECTOR_PROMPT } from "../prompts/visual-director.prompt";

@Injectable()
export class VisualDirectorAgent {
  private readonly logger = new Logger(VisualDirectorAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async createVisualBible(
    concept: CreativeConceptDTO,
  ): Promise<VisualBibleDTO> {
    this.logger.log(`Creating dynamic Visual Bible for concept: "${concept.title}"`);

    const userPrompt = VISUAL_DIRECTOR_PROMPT.buildUserPrompt({
      title: concept.title,
      creativeDirection: concept.creativeDirection,
      platform: concept.platform,
    });

    const result = await executeLLMAgent<VisualBibleDTO>(
      this.aiEngine,
      VISUAL_DIRECTOR_PROMPT.systemInstructions,
      userPrompt,
      VisualBibleSchema,
      this.logger,
      VisualDirectorAgent.name,
      VISUAL_DIRECTOR_PROMPT.version,
    );

    return result.data;
  }
}
