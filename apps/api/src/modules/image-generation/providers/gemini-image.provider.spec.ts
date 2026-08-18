import { GeminiImageProvider } from "./gemini-image.provider";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("GeminiImageProvider", () => {
  let provider: GeminiImageProvider;

  beforeEach(() => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "GEMINI_API_KEY") return "mock-gemini-key";
        if (key === "GEMINI_IMAGE_MODEL") return "gemini-3.1-flash-image";
        return null;
      }),
    } as any;

    provider = new GeminiImageProvider(configService);
  });

  it("should return status AVAILABLE when GEMINI_API_KEY is configured", async () => {
    const status = await provider.getStatus();
    expect(status.status).toBe("AVAILABLE");
  });

  it("should return status UNAVAILABLE when GEMINI_API_KEY is missing", async () => {
    const unconfigured = new GeminiImageProvider({ get: () => null } as any);
    const status = await unconfigured.getStatus();
    expect(status.status).toBe("UNAVAILABLE");
  });

  it("should generate image binary cleanly via Gemini 3.1 Flash Image API", async () => {
    const b64Data = Buffer.from("fake-gemini-image-data").toString("base64");
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/jpeg",
                    data: b64Data,
                  },
                },
              ],
            },
          },
        ],
        usageMetadata: { totalTokenCount: 1024 },
      },
    });

    const output = await provider.generateImage({
      prompt: "Industrial factory skyline",
      positivePrompt: "9:16 vertical shot, 8k resolution industrial plant",
      negativePrompt: "blurry",
      aspectRatio: "9:16",
      width: 768,
      height: 1344,
    });

    expect(output.buffer).toBeDefined();
    expect(output.provider).toBe("gemini");
    expect(output.model).toBe("gemini-3.1-flash-image");
    expect(output.mimeType).toBe("image/jpeg");
    expect(output.buffer.toString()).toBe("fake-gemini-image-data");

    // Verify header x-goog-api-key was passed correctly
    expect(mockedAxios.post).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent",
      expect.objectContaining({
        contents: expect.any(Array),
        generationConfig: {
          responseModalities: ["IMAGE"],
        },
      }),
      expect.objectContaining({
        headers: {
          "x-goog-api-key": "mock-gemini-key",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("should support reference image input part for character consistency", async () => {
    const b64Data = Buffer.from("fake-gemini-image-data").toString("base64");
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: "image/png",
                    data: b64Data,
                  },
                },
              ],
            },
          },
        ],
      },
    });

    const output = await provider.generateImage({
      prompt: "Industrial expert speaking",
      positivePrompt: "Tech lead speaking in factory",
      negativePrompt: "blurry",
      aspectRatio: "9:16",
      width: 768,
      height: 1344,
      referenceImageUrl: "data:image/png;base64,refImageBase64DataString",
    });

    expect(output.consistencyMechanism).toBe("character_reference_image");
  });

  it("should throw error if GEMINI_API_KEY is missing during generateImage call", async () => {
    const unconfigured = new GeminiImageProvider({ get: () => null } as any);
    await expect(
      unconfigured.generateImage({
        prompt: "test",
        positivePrompt: "test",
        negativePrompt: "test",
        aspectRatio: "9:16",
        width: 768,
        height: 1344,
      }),
    ).rejects.toThrow("GEMINI_API_KEY is missing");
  });
});
