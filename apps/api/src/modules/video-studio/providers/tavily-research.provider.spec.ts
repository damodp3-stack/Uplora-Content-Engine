import { TavilyResearchProvider } from "./tavily-research.provider";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("TavilyResearchProvider", () => {
  let provider: TavilyResearchProvider;
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "TAVILY_API_KEY") return "test-tavily-key";
        return null;
      }),
    };
    provider = new TavilyResearchProvider(configService as ConfigService);
  });

  it("should return isAvailable = true when TAVILY_API_KEY is configured", async () => {
    const available = await provider.isAvailable();
    expect(available).toBe(true);
  });

  it("should return isAvailable = false when TAVILY_API_KEY is missing", async () => {
    const unconfiguredConfig = { get: jest.fn().mockReturnValue(null) };
    const unconfiguredProvider = new TavilyResearchProvider(unconfiguredConfig as any);

    const available = await unconfiguredProvider.isAvailable();
    expect(available).toBe(false);
  });

  it("should gather web research items successfully with source URLs and evidence", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        results: [
          {
            title: "B2B Industrial Buyers Digital Report 2026",
            url: "https://example.com/reports/b2b-industrial-2026",
            content: "94 percent of industrial procurement executives conduct online research prior to contacting sales representatives.",
            published_date: "2026-01-15",
          },
        ],
      },
    });

    const result = await provider.gatherResearch("Industrial Websites", "Procurement VPs");

    expect(result).toBeDefined();
    expect(result?.status).toBe("AVAILABLE");
    expect(result?.insights).toHaveLength(1);
    expect(result?.insights[0].sourceUrl).toBe("https://example.com/reports/b2b-industrial-2026");
    expect(result?.insights[0].claimType).toBe("SUPPORTED_FACT");
    expect(result?.insights[0].extractedEvidence).toContain("94 percent");
  });

  it("should handle Tavily API timeout or error gracefully by returning null", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("Request timeout after 10000ms"));

    const result = await provider.gatherResearch("Industrial Websites", "Procurement VPs");
    expect(result).toBeNull();
  });
});
