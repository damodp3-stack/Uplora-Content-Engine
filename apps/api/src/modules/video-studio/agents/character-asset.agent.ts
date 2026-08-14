import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  CreativeConceptDTO,
  VisualBibleDTO,
  StoryboardDTO,
  CharacterAssetPackageDTO,
  CharacterAssetPackageSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { CHARACTER_ASSET_PROMPT } from "../prompts/character-asset.prompt";

@Injectable()
export class CharacterAssetAgent {
  private readonly logger = new Logger(CharacterAssetAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async generateProfiles(
    concept: CreativeConceptDTO,
    visualBible: VisualBibleDTO,
    storyboard: StoryboardDTO,
  ): Promise<CharacterAssetPackageDTO> {
    this.logger.log(
      `Analyzing dynamic character/asset requirements for concept: "${concept.title}"`,
    );

    const shotsSummary = storyboard.shots
      .map((s) => `Shot ${s.shotNumber}: ${s.visualDescription}`)
      .join("; ");

    const userPrompt = CHARACTER_ASSET_PROMPT.buildUserPrompt({
      title: concept.title,
      artDirection: visualBible.artDirection,
      shotsSummary,
    });

    const result = await executeLLMAgent<CharacterAssetPackageDTO>(
      this.aiEngine,
      CHARACTER_ASSET_PROMPT.systemInstructions,
      userPrompt,
      CharacterAssetPackageSchema,
      this.logger,
      CharacterAssetAgent.name,
      CHARACTER_ASSET_PROMPT.version,
    );

    return result.data;
  }
}
