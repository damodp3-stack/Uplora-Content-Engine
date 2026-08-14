import { AIEngineService } from "./ai-engine.service";
import { ConfigService } from "@nestjs/config";
import { PromptEngineService } from "./prompt-engine.service";
import { GeminiProvider } from "./providers/gemini.provider";
import { OpenAIProvider } from "./providers/openai.provider";
import { OllamaProvider } from "./providers/ollama.provider";
import { HuggingFaceProvider } from "./providers/huggingface.provider";
import { ServiceUnavailableException } from "@nestjs/common";

describe("AIEngineService", () => {
  let service: AIEngineService;
  let mockConfig: Partial<ConfigService>;
  let mockPromptEngine: Partial<PromptEngineService>;
  let mockGemini: Partial<GeminiProvider>;
  let mockOpenAI: Partial<OpenAIProvider>;
  let mockOllama: Partial<OllamaProvider>;
  let mockHuggingFace: Partial<HuggingFaceProvider>;

  beforeEach(() => {
    mockConfig = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "AI_DEFAULT_PROVIDER") return "gemini";
        return null;
      }),
    };

    mockPromptEngine = {
      build: jest.fn().mockReturnValue({
        systemPrompt: "System instruction",
        userPrompt: "User prompt",
        templateId: "blog_post",
        missingVariables: [],
      }),
      getVersion: jest.fn().mockReturnValue("3.0.0"),
    };

    mockGemini = {
      name: "gemini",
      getStatus: jest.fn().mockResolvedValue({ provider: "gemini", status: "AVAILABLE" }),
      generate: jest.fn().mockResolvedValue({
        content: '{"result": "gemini output"}',
        model: "gemini/gemini-1.5-flash",
        tokens: 150,
        provider: "gemini",
        latencyMs: 80,
        estimatedCostUSD: 0.0001,
      }),
    };

    mockOpenAI = {
      name: "openai",
      getStatus: jest.fn().mockResolvedValue({ provider: "openai", status: "UNAVAILABLE", message: "OPENAI_API_KEY is missing" }),
      generate: jest.fn().mockRejectedValue(new Error("OPENAI_API_KEY is missing")),
    };

    mockOllama = {
      name: "ollama",
      getStatus: jest.fn().mockResolvedValue({ provider: "ollama", status: "UNAVAILABLE", message: "Daemon unreachable" }),
      generate: jest.fn().mockRejectedValue(new Error("Daemon unreachable")),
    };

    mockHuggingFace = {
      name: "huggingface",
      getStatus: jest.fn().mockResolvedValue({ provider: "huggingface", status: "UNAVAILABLE" }),
    };

    service = new AIEngineService(
      mockConfig as ConfigService,
      mockPromptEngine as PromptEngineService,
      mockGemini as GeminiProvider,
      mockOpenAI as OpenAIProvider,
      mockOllama as OllamaProvider,
      mockHuggingFace as HuggingFaceProvider,
    );
  });

  it("should return provider health statuses for all registered providers", async () => {
    const statuses = await service.getProviderStatuses();
    expect(statuses).toHaveLength(3);
    expect(statuses.find((s) => s.provider === "gemini")?.status).toBe("AVAILABLE");
    expect(statuses.find((s) => s.provider === "openai")?.status).toBe("UNAVAILABLE");
  });

  it("should generate content using default Gemini provider when available", async () => {
    const response = await service.generateContent({
      prompt: "Test topic",
      type: "blog_post",
    });

    expect(response).toBeDefined();
    expect(response.metadata.provider).toBe("gemini");
    expect(response.content).toContain("gemini output");
    expect(mockGemini.generate).toHaveBeenCalledTimes(1);
  });

  it("should failover to OpenAI if Gemini fails and OpenAI is AVAILABLE", async () => {
    (mockGemini.getStatus as jest.Mock).mockResolvedValue({ provider: "gemini", status: "UNAVAILABLE" });
    (mockOpenAI.getStatus as jest.Mock).mockResolvedValue({ provider: "openai", status: "AVAILABLE" });
    (mockOpenAI.generate as jest.Mock).mockResolvedValue({
      content: '{"result": "openai output"}',
      model: "gpt-4o-mini",
      tokens: 180,
      provider: "openai",
      latencyMs: 120,
      estimatedCostUSD: 0.002,
    });

    const response = await service.generateContent({
      prompt: "Test topic",
      type: "blog_post",
    });

    expect(response.metadata.provider).toBe("openai");
    expect(response.content).toContain("openai output");
  });

  it("should throw ServiceUnavailableException if NO real provider is available", async () => {
    (mockGemini.getStatus as jest.Mock).mockResolvedValue({ provider: "gemini", status: "UNAVAILABLE" });
    (mockOpenAI.getStatus as jest.Mock).mockResolvedValue({ provider: "openai", status: "UNAVAILABLE" });
    (mockOllama.getStatus as jest.Mock).mockResolvedValue({ provider: "ollama", status: "UNAVAILABLE" });

    await expect(
      service.generateContent({ prompt: "Test topic", type: "blog_post" }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
