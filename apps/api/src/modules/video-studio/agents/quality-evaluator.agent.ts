import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  QualityEvaluationDTO,
  QualityEvaluationSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { QUALITY_EVALUATOR_PROMPT } from "../prompts/quality-evaluator.prompt";

@Injectable()
export class QualityEvaluatorAgent {
  private readonly logger = new Logger(QualityEvaluatorAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async evaluateQuality(
    rawPrompt: string,
    concept: any,
    research: any,
    strategy: any,
    script: any,
    storyboard: any,
    visualBible: any,
    characterAssetPkg: any,
    hasMediaAssets: boolean = false,
  ): Promise<QualityEvaluationDTO> {
    this.logger.log(`Evaluating creative quality & readiness for prompt: "${rawPrompt}"`);

    const userPrompt = QUALITY_EVALUATOR_PROMPT.buildUserPrompt({
      rawPrompt,
      concept,
      research,
      strategy,
      script,
      storyboard,
      visualBible,
      characterAssetPkg,
    });

    const result = await executeLLMAgent<QualityEvaluationDTO>(
      this.aiEngine,
      QUALITY_EVALUATOR_PROMPT.systemInstructions,
      userPrompt,
      QualityEvaluationSchema,
      this.logger,
      QualityEvaluatorAgent.name,
      QUALITY_EVALUATOR_PROMPT.version,
    );

    const evaluation = result.data;

    // Strict Enforcement of Production Readiness Rule:
    // If physical/digital media files (images, audio, video) do NOT exist,
    // productionReadinessScore MUST be 0.
    if (!hasMediaAssets) {
      evaluation.productionReadinessScore = 0;
      evaluation.feedback.productionReadiness =
        "Production readiness is 0% because physical/digital media assets (images, voice, video renders) have not been generated yet.";
    }

    // Ensure Blueprint Quality Score is computed accurately from creative metrics
    const creativeAverage = Math.round(
      (evaluation.humanNaturalnessScore +
        evaluation.genericAIScore +
        evaluation.claimSafetyScore +
        evaluation.visualNarrativeScore +
        evaluation.productionFeasibilityScore) /
        5,
    );
    evaluation.blueprintQualityScore = creativeAverage;

    this.logger.log(
      `Quality Evaluation Completed. Blueprint Quality: ${evaluation.blueprintQualityScore}/100, Production Readiness: ${evaluation.productionReadinessScore}/100`,
    );

    return evaluation;
  }
}
