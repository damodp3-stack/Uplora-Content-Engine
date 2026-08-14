import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  ScriptDocumentDTO,
  StoryboardDTO,
  StoryboardSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { STORYBOARD_PROMPT } from "../prompts/storyboard.prompt";

@Injectable()
export class StoryboardDirectorAgent {
  private readonly logger = new Logger(StoryboardDirectorAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async createStoryboard(script: ScriptDocumentDTO): Promise<StoryboardDTO> {
    this.logger.log(
      `Creating dynamic shot-by-shot storyboard from script with ${script.scenes.length} scenes`,
    );

    const userPrompt = STORYBOARD_PROMPT.buildUserPrompt({
      title: script.title,
      targetDurationSec: script.estimatedDurationSec,
      scenes: script.scenes.map((s) => ({
        sceneIndex: s.sceneIndex,
        suggestedDurationSec: s.suggestedDurationSec,
        narration: s.narration,
        sceneIntent: s.sceneIntent,
      })),
    });

    const result = await executeLLMAgent<StoryboardDTO>(
      this.aiEngine,
      STORYBOARD_PROMPT.systemInstructions,
      userPrompt,
      StoryboardSchema,
      this.logger,
      StoryboardDirectorAgent.name,
      STORYBOARD_PROMPT.version,
    );

    const storyboard = result.data;
    this.validateAndNormalizeShotPlan(storyboard, script.estimatedDurationSec);
    return storyboard;
  }

  private validateAndNormalizeShotPlan(
    storyboard: StoryboardDTO,
    targetDurationSec: number,
  ): void {
    if (!storyboard.shots || storyboard.shots.length === 0) {
      throw new Error("Shot plan validation failed: Storyboard contains zero shots.");
    }

    // 1. Verify positive durations and no negative or zero shot times
    for (let i = 0; i < storyboard.shots.length; i++) {
      const shot = storyboard.shots[i];
      if (shot.durationSec <= 0) {
        throw new Error(
          `Shot plan validation failed: Shot #${shot.shotNumber} has invalid duration (${shot.durationSec}s).`,
        );
      }
    }

    // 2. Validate and adjust total duration sum to match target duration precisely
    const currentSum = storyboard.shots.reduce((acc, s) => acc + s.durationSec, 0);
    const delta = Math.round((targetDurationSec - currentSum) * 10) / 10;

    if (Math.abs(delta) > 0.001) {
      // Adjust last shot duration so exact sum matches target duration
      const lastIndex = storyboard.shots.length - 1;
      const newDuration = Math.round((storyboard.shots[lastIndex].durationSec + delta) * 10) / 10;
      if (newDuration > 0) {
        storyboard.shots[lastIndex].durationSec = newDuration;
      }
    }

    // 3. Verify total duration sum matches target duration
    const finalSum = storyboard.shots.reduce((acc, s) => acc + s.durationSec, 0);
    if (Math.abs(finalSum - targetDurationSec) > 0.1) {
      throw new Error(
        `Shot plan validation failed: Total shot duration (${finalSum}s) does not equal target duration (${targetDurationSec}s).`,
      );
    }

    storyboard.estimatedTotalDurationSec = targetDurationSec;
    storyboard.totalShots = storyboard.shots.length;

    // 4. Verify sequential non-overlapping timeline
    let currentTime = 0;
    for (let i = 0; i < storyboard.shots.length; i++) {
      const shot = storyboard.shots[i];
      shot.shotNumber = i + 1; // Strict 1-indexed shot numbering
      const startTime = currentTime;
      currentTime += shot.durationSec;
      if (currentTime > targetDurationSec + 0.1) {
        throw new Error(
          `Shot plan validation failed: Shot #${shot.shotNumber} exceeds project duration boundaries.`,
        );
      }
    }

    this.logger.log(
      `✅ Shot plan validated: ${storyboard.shots.length} shots spanning ${targetDurationSec}s timeline with 0 gaps or overlaps.`,
    );
  }
}
