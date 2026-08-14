import { GeminiProvider } from "./gemini.provider";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GeminiProvider", () => {
  let provider: GeminiProvider;
  let configService: Partial<ConfigService>;

  beforeEach(() => {
    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "GEMINI_API_KEY") return "mock-gemini-key";
        if (key === "ai.geminiModel") return "gemini-1.5-flash";
        return null;
      }),
    };
    provider = new GeminiProvider(configService as ConfigService);
  });

  it("should return status UNAVAILABLE if GEMINI_API_KEY is missing", async () => {
    const unconfiguredConfig = { get: jest.fn().mockReturnValue(null) };
    const unconfiguredProvider = new GeminiProvider(unconfiguredConfig as any);

    const health = await unconfiguredProvider.getStatus();
    expect(health.status).toBe("UNAVAILABLE");
    expect(health.message).toContain("GEMINI_API_KEY");
  });

  it("should return status AVAILABLE if GEMINI_API_KEY is set", async () => {
    const health = await provider.getStatus();
    expect(health.status).toBe("AVAILABLE");
  });

  it("should generate content successfully via Gemini API endpoint", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: {
              parts: [{ text: '{"status": "success", "message": "hello"}' }],
            },
          },
        ],
        usageMetadata: {
          totalTokenCount: 120,
        },
      },
    });

    const result = await provider.generate("System instruction", "User prompt", 1000);
    expect(result).toBeDefined();
    expect(result.provider).toBe("gemini");
    expect(result.content).toBe('{"status": "success", "message": "hello"}');
    expect(result.tokens).toBe(120);
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
  });

  it("should throw error if API call fails", async () => {
    mockedAxios.post.mockRejectedValue(new Error("Invalid API key"));

    await expect(
      provider.generate("System prompt", "User prompt"),
    ).rejects.toThrow("Gemini provider error: Invalid API key");
  });
});
