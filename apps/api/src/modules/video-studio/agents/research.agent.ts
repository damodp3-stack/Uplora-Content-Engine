import { Injectable, Logger } from "@nestjs/common";
import { ResearchDTO, ResearchSchema } from "../schemas/phase2-deliverables.schema";
import { IResearchProvider } from "../providers/research-provider.interface";
import { AIEngineService } from "../../ai-engine/ai-engine.service";
import { executeLLMAgent } from "./agent-llm-helper";
import { RESEARCH_PROMPT } from "../prompts/research.prompt";

@Injectable()
export class ResearchAgent {
  private readonly logger = new Logger(ResearchAgent.name);
  private researchProvider: IResearchProvider | null = null;

  constructor(private readonly aiEngine: AIEngineService) {}

  setProvider(provider: IResearchProvider) {
    this.researchProvider = provider;
  }

  async collectResearch(
    topic: string,
    targetAudience: string,
    allowSynthesisFallback: boolean = true,
  ): Promise<ResearchDTO> {
    this.logger.log(`Conducting research for topic: "${topic}"`);

    // 1. Check if external provider is registered and available
    if (this.researchProvider) {
      try {
        const isAvailable = await this.researchProvider.isAvailable();
        if (isAvailable) {
          const result = await this.researchProvider.gatherResearch(
            topic,
            targetAudience,
          );
          if (result) {
            // Ensure claimType is present
            result.insights = result.insights.map((item) => ({
              ...item,
              claimType: item.claimType || "SUPPORTED_FACT",
            }));
            return result;
          }
        }
      } catch (err) {
        this.logger.warn(`External research provider failed: ${(err as Error).message}`);
      }
    }

    // 2. If synthesis fallback allowed via AIEngine
    if (allowSynthesisFallback) {
      try {
        const result = await executeLLMAgent<ResearchDTO>(
          this.aiEngine,
          RESEARCH_PROMPT.systemInstructions,
          RESEARCH_PROMPT.buildUserPrompt({ topic, targetAudience }),
          ResearchSchema,
          this.logger,
          ResearchAgent.name,
          RESEARCH_PROMPT.version,
        );

        const data = result.data;
        // Verify claim safety in synthesized research
        data.insights = data.insights.map((item) => {
          const hasStats = /\$\d[\d,]*|\b\d+(\.\d+)?%|\b\d+\s+(million|billion)\b/i.test(item.claim);
          const claimType = hasStats ? "UNVERIFIED_CLAIM" : (item.claimType || "CREATIVE_CLAIM");
          return {
            ...item,
            claimType,
          };
        });

        return data;
      } catch (err) {
        this.logger.warn(
          `Research synthesis fallback failed: ${(err as Error).message}`,
        );
      }
    }

    // 3. Explicit RESEARCH_UNAVAILABLE if no provider & synthesis unavailable
    this.logger.log(`No research provider active. Returning RESEARCH_UNAVAILABLE.`);
    return {
      status: "RESEARCH_UNAVAILABLE",
      summary: "No external research provider configured.",
      insights: [],
      terminology: [],
      collectedAt: new Date().toISOString(),
      provider: "none",
    };
  }
}
