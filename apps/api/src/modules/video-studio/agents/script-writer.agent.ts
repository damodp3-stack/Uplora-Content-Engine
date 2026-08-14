import { Injectable, Logger } from "@nestjs/common";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import {
  CreativeConceptDTO,
  ResearchDTO,
  StrategyBlueprintDTO,
  ScriptDocumentDTO,
  ScriptDocumentSchema,
} from "../schemas/phase2-deliverables.schema";
import { executeLLMAgent } from "./agent-llm-helper";
import { SCRIPT_WRITER_PROMPT } from "../prompts/script-writer.prompt";

@Injectable()
export class ScriptWriterAgent {
  private readonly logger = new Logger(ScriptWriterAgent.name);

  constructor(private readonly aiEngine: AIEngineService) {}

  async writeScript(
    concept: CreativeConceptDTO,
    strategy: StrategyBlueprintDTO,
    research?: ResearchDTO,
  ): Promise<ScriptDocumentDTO> {
    this.logger.log(
      `Writing dynamic timed script for "${concept.title}" (${concept.duration}s target)`,
    );

    const wpm = strategy?.pacingStrategy === "fast" ? 165 : 145;
    const targetDurationMs = concept.duration * 1000;
    const toleranceMs = Math.max(3500, Math.round(targetDurationMs * 0.12)); // +/- 3.5s or 12% tolerance
    const maxRetries = 2;

    let userPrompt = SCRIPT_WRITER_PROMPT.buildUserPrompt({
      title: concept.title,
      targetDurationSec: concept.duration,
      hook: strategy.hook,
      coreMessage: strategy.coreMessage,
      ctaText: strategy.cta.text,
      language: concept.language,
      researchStatus: research?.status,
      targetWpm: wpm,
    });

    let scriptDoc: ScriptDocumentDTO | null = null;
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      const result = await executeLLMAgent<ScriptDocumentDTO>(
        this.aiEngine,
        SCRIPT_WRITER_PROMPT.systemInstructions,
        userPrompt,
        ScriptDocumentSchema,
        this.logger,
        ScriptWriterAgent.name,
        SCRIPT_WRITER_PROMPT.version,
      );

      scriptDoc = result.data;
      scriptDoc.wordsPerMinute = wpm;
      scriptDoc.targetDurationMs = targetDurationMs;

      // Clean full narration text & calculate accurate speech timing
      const fullText = scriptDoc.scenes.map((s) => s.narration).join(" ");
      scriptDoc.fullNarrationText = fullText;
      const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
      scriptDoc.wordCount = wordCount;

      const estimatedSpeechDurationMs = Math.round((wordCount / wpm) * 60 * 1000);
      const varianceMs = estimatedSpeechDurationMs - targetDurationMs;

      scriptDoc.estimatedSpeechDurationMs = estimatedSpeechDurationMs;
      scriptDoc.timingVarianceMs = varianceMs;

      // Claim safety check: If research is unavailable, sanitize fake stats/dollar figures
      if (research?.status === "RESEARCH_UNAVAILABLE") {
        scriptDoc = this.enforceClaimSafety(scriptDoc);
      }

      if (Math.abs(varianceMs) <= toleranceMs) {
        scriptDoc.timingStatus = "TIMING_VALIDATED";
        this.logger.log(
          `✅ Script timing validated successfully: ${wordCount} words (${estimatedSpeechDurationMs}ms vs target ${targetDurationMs}ms, variance: ${varianceMs}ms)`,
        );
        return scriptDoc;
      }

      // Outside tolerance
      this.logger.warn(
        `⚠️ Script timing out of tolerance (Attempt ${retryCount + 1}/${maxRetries + 1}): ${wordCount} words = ${estimatedSpeechDurationMs}ms (target: ${targetDurationMs}ms, variance: ${varianceMs}ms)`,
      );

      if (retryCount < maxRetries) {
        retryCount++;
        const targetWords = Math.round((concept.duration * wpm) / 60);
        this.logger.log(
          `🔄 Automatically requesting Gemini script rewrite (Attempt ${retryCount}/${maxRetries}). Target word count: ${targetWords}`,
        );

        userPrompt = SCRIPT_WRITER_PROMPT.buildRevisionUserPrompt({
          title: concept.title,
          targetDurationSec: concept.duration,
          currentWordCount: wordCount,
          currentSpeechDurationMs: estimatedSpeechDurationMs,
          targetDurationMs,
          varianceMs,
          targetWords,
          wpm,
          previousScriptJson: JSON.stringify(scriptDoc, null, 2),
          researchStatus: research?.status,
        });
      } else {
        break;
      }
    }

    // If still outside tolerance after max retries
    if (scriptDoc) {
      scriptDoc.timingStatus = "TIMING_VALIDATION_FAILED";
      this.logger.error(
        `❌ SCRIPT_TIMING_VALIDATION_FAILED: Final script duration ${scriptDoc.estimatedSpeechDurationMs}ms is outside tolerance for ${targetDurationMs}ms (variance: ${scriptDoc.timingVarianceMs}ms)`,
      );
      throw new Error(
        `TIMING_VALIDATION_FAILED: Script speech duration (${(scriptDoc.estimatedSpeechDurationMs / 1000).toFixed(1)}s) does not fit target duration (${concept.duration}s). Variance: ${scriptDoc.timingVarianceMs}ms. Auto-rewrite retries exhausted.`,
      );
    }

    throw new Error("Script generation failed completely.");
  }

  private enforceClaimSafety(scriptDoc: ScriptDocumentDTO): ScriptDocumentDTO {
    let sanitized = false;

    scriptDoc.scenes = scriptDoc.scenes.map((scene) => {
      let narration = scene.narration;

      // Replace fake dollar figures or statistics with creative framing if research is unavailable
      if (/\$\d[\d,]*|\b\d+(\.\d+)?%|\b\d+\s+(million|billion)\b/i.test(narration)) {
        this.logger.warn(
          `Sanitizing unsupported claim in scene ${scene.sceneIndex}: "${narration}"`,
        );
        narration = narration
          .replace(/\$\d[\d,]*(?:\s*million|\s*billion)?/gi, "high-value")
          .replace(/\b94%\b|\b92%\b|\b\d+%\b/g, "the vast majority")
          .replace(/94 percent|92 percent|\d+ percent/gi, "the vast majority");
        sanitized = true;
      }

      return {
        ...scene,
        narration,
      };
    });

    if (sanitized) {
      const fullText = scriptDoc.scenes.map((s) => s.narration).join(" ");
      scriptDoc.fullNarrationText = fullText;
      scriptDoc.wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;
    }

    return scriptDoc;
  }
}
