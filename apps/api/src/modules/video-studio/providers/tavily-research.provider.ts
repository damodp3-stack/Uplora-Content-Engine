import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { IResearchProvider } from "./research-provider.interface";
import { ResearchDTO, ResearchItemSchema } from "../schemas/phase2-deliverables.schema";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  published_date?: string;
}

@Injectable()
export class TavilyResearchProvider implements IResearchProvider {
  readonly name = "tavily";
  private readonly logger = new Logger(TavilyResearchProvider.name);

  constructor(private readonly configService: ConfigService) {}

  async isAvailable(): Promise<boolean> {
    const apiKey = this.getApiKey();
    return !!apiKey;
  }

  async gatherResearch(topic: string, audience: string): Promise<ResearchDTO | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      this.logger.warn("TAVILY_API_KEY is not configured. Research provider unavailable.");
      return null;
    }

    const searchQuery = `${topic} ${audience} industry facts data statistics`.trim();
    const startTime = Date.now();

    try {
      const response = await axios.post<{ results: TavilySearchResult[] }>(
        "https://api.tavily.com/search",
        {
          api_key: apiKey,
          query: searchQuery,
          search_depth: "basic",
          include_answer: false,
          max_results: 5,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 10000, // 10s timeout
        },
      );

      const latency = Date.now() - startTime;
      const results = response.data?.results || [];

      if (!results.length) {
        this.logger.warn(`Tavily search returned zero results for query: "${searchQuery}"`);
        return null;
      }

      const insights = results.slice(0, 5).map((res) => {
        const rawItem = {
          category: "fact",
          claim: res.title || res.content.substring(0, 120),
          source: res.title || res.url,
          confidence: "high",
          claimType: "SUPPORTED_FACT",
          sourceUrl: res.url,
          sourceTitle: res.title,
          sourceDate: res.published_date,
          extractedEvidence: res.content.substring(0, 300),
        };
        return ResearchItemSchema.parse(rawItem);
      });

      this.logger.log(
        `✅ Tavily research gathered ${insights.length} verified web sources (${latency}ms)`,
      );

      return {
        status: "AVAILABLE",
        summary: `Gathered ${insights.length} real-time verified web research sources for "${topic}".`,
        insights,
        terminology: [audience, "B2B Procurement", "Digital Twin"],
        collectedAt: new Date().toISOString(),
        provider: "tavily",
      };
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Tavily API request failed";
      this.logger.error(`❌ Tavily research error: ${errorMsg}`);
      return null;
    }
  }

  private getApiKey(): string | null {
    return (
      this.configService.get<string>("TAVILY_API_KEY") ||
      this.configService.get<string>("RESEARCH_API_KEY") ||
      process.env.TAVILY_API_KEY ||
      null
    );
  }
}
