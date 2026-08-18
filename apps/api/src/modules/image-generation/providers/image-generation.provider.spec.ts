import { FalImageProvider } from "./fal-image.provider";
import { OpenAIImageProvider } from "./openai-image.provider";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Image Generation Providers (Fal.ai & OpenAI)", () => {
  let falProvider: FalImageProvider;
  let openaiProvider: OpenAIImageProvider;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "FAL_KEY") return "mock-fal-key";
        if (key === "OPENAI_API_KEY") return "mock-openai-key";
        return null;
      }),
    } as any;

    falProvider = new FalImageProvider(configService);
    openaiProvider = new OpenAIImageProvider(configService);
  });

  describe("FalImageProvider", () => {
    it("should return status AVAILABLE when FAL_KEY is configured", async () => {
      const status = await falProvider.getStatus();
      expect(status.status).toBe("AVAILABLE");
    });

    it("should generate image binary cleanly via Fal.ai API", async () => {
      mockedAxios.post.mockResolvedValueOnce({
        data: { images: [{ url: "https://fal.media/output.png" }] },
        headers: { "x-request-id": "req-fal-123" },
      });
      mockedAxios.get.mockResolvedValueOnce({
        data: Buffer.from("fake-fal-png-data"),
        headers: { "content-type": "image/png" },
      });

      const output = await falProvider.generateImage({
        prompt: "Industrial factory skyline",
        positivePrompt: "9:16 vertical shot, 8k resolution industrial plant",
        negativePrompt: "blurry",
        aspectRatio: "9:16",
        width: 768,
        height: 1344,
      });

      expect(output.buffer).toBeDefined();
      expect(output.provider).toBe("fal");
      expect(output.mimeType).toBe("image/png");
    });

    it("should throw error if FAL_KEY is missing", async () => {
      const unconfigured = new FalImageProvider({ get: () => null } as any);
      await expect(
        unconfigured.generateImage({
          prompt: "test",
          positivePrompt: "test",
          negativePrompt: "test",
          aspectRatio: "9:16",
          width: 768,
          height: 1344,
        }),
      ).rejects.toThrow("FAL_KEY is missing");
    });
  });

  describe("OpenAIImageProvider", () => {
    it("should generate image binary cleanly via OpenAI DALL-E 3 API", async () => {
      const b64Data = Buffer.from("fake-dalle-png-data").toString("base64");
      mockedAxios.post.mockResolvedValueOnce({
        data: { data: [{ b64_json: b64Data }] },
      });

      const output = await openaiProvider.generateImage({
        prompt: "Industrial factory skyline",
        positivePrompt: "Industrial plant",
        negativePrompt: "blurry",
        aspectRatio: "9:16",
        width: 1024,
        height: 1792,
      });

      expect(output.buffer).toBeDefined();
      expect(output.provider).toBe("openai");
      expect(output.model).toBe("dall-e-3");
    });
  });
});
