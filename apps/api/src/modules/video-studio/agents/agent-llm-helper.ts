import { Logger } from "@nestjs/common";
import { z } from "zod";
import { AIEngineService } from "../../ai-engine/ai-engine.service";

export interface AgentExecutionResult<T> {
  data: T;
  metadata: {
    provider: string;
    model: string;
    generationTimeMs: number;
    isMock: boolean;
    promptVersion?: string;
  };
}

export async function executeLLMAgent<T>(
  aiEngine: AIEngineService,
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>,
  logger: Logger,
  agentName: string,
  promptVersion: string = "2.0.0",
  maxRetries: number = 2,
): Promise<AgentExecutionResult<T>> {
  let attempt = 0;
  let currentPrompt = userPrompt;

  while (attempt <= maxRetries) {
    attempt++;
    const startTime = Date.now();

    try {
      const response = await aiEngine.generateContent({
        prompt: currentPrompt,
        type: "agent_json",
        templateVariables: {
          systemPrompt: `${systemPrompt}\n\nCRITICAL OUTPUT FORMAT REQUIREMENT: Respond ONLY with a valid raw JSON object matching the requested schema. Do NOT include markdown code blocks or any extra text. Output strictly valid JSON. Ensure all property values are correctly quoted and all structural commas exist between properties.`,
          prompt: currentPrompt,
        },
        maxTokens: 4000,
      });

      const latency = Date.now() - startTime;
      const rawContent = response.content || "";
      const isMock =
        response.metadata?.model === "fallback-template" ||
        response.metadata?.provider === "ollama_fallback";

      const cleanedJson = cleanJsonOutput(rawContent);
      let parsedRaw: any;
      try {
        parsedRaw = JSON.parse(cleanedJson);
      } catch (parseErr) {
        // Attempt advanced repair if simple parse fails
        const repaired = autoRepairJsonSyntax(cleanedJson);
        parsedRaw = JSON.parse(repaired);
      }

      const validatedData = schema.parse(parsedRaw);

      logger.log(
        `✅ [${agentName}] Executed successfully (Attempt ${attempt}, Provider: ${response.metadata?.provider}, Latency: ${latency}ms, Mock: ${isMock})`,
      );

      return {
        data: validatedData,
        metadata: {
          provider: response.metadata?.provider || "unknown",
          model: response.metadata?.model || "unknown",
          generationTimeMs: latency,
          isMock,
          promptVersion,
        },
      };
    } catch (err) {
      const errorMsg = (err as Error).message;
      logger.warn(
        `⚠️ [${agentName}] Validation/Parse failed (Attempt ${attempt}/${maxRetries + 1}): ${errorMsg}`,
      );

      if (attempt > maxRetries) {
        throw new Error(
          `Agent [${agentName}] failed validation after ${maxRetries + 1} attempts: ${errorMsg}`,
        );
      }

      currentPrompt = `${userPrompt}\n\nCRITICAL FIX REQUIRED: Your previous output failed JSON/Schema validation with error: "${errorMsg}". Output ONLY valid, fully escape-quoted JSON matching the exact required schema! Make sure to put commas between object keys!`;
    }
  }

  throw new Error(`Agent [${agentName}] failed execution.`);
}

function cleanJsonOutput(content: string): string {
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

function autoRepairJsonSyntax(jsonStr: string): string {
  let repaired = jsonStr;
  // Fix unescaped newlines within double quotes
  repaired = repaired.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match) =>
    match.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
  );
  // Repair missing commas between structural elements e.g. } "key": or "val" "key": or ] "key":
  repaired = repaired.replace(/([}\]"0-9a-zA-Z])\s*\n?\s*("[\w]+"\s*:)/g, "$1, $2");
  // Repair trailing commas before closing braces/brackets e.g. , } -> }
  repaired = repaired.replace(/,\s*([}\]])/g, "$1");
  return repaired;
}
