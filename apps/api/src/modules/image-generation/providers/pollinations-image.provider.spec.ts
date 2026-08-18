import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import { PollinationsImageProvider } from "./pollinations-image.provider";
import { ImageGenerationOptions } from "./image-provider.interface";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("PollinationsImageProvider", () => {
  let provider: PollinationsImageProvider;

  const mockOptions: ImageGenerationOptions = {
    prompt: "Industrial factory CNC machine",
    positivePrompt: "Industrial factory CNC machine with engineer in clean lighting",
    negativePrompt: "blurry, ugly, text, watermark",
    aspectRatio: "9:16",
    width: 576,
    height: 1024,
    seed: 12345,
  };

  const validJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        PollinationsImageProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "POLLINATIONS_MODEL") return "flux";
              return null;
            }),
          },
        },
      ],
    }).compile();

    provider = moduleRef.get<PollinationsImageProvider>(
      PollinationsImageProvider,
    );
  });

  it("should report status as AVAILABLE without requiring API credentials", async () => {
    const status = await provider.getStatus();
    expect(status.status).toBe("AVAILABLE");
  });

  it("should successfully generate a 9:16 binary image response", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: validJpegBuffer,
      headers: { "content-type": "image/jpeg" },
    });

    const result = await provider.generateImage(mockOptions);

    expect(result.provider).toBe("pollinations");
    expect(result.model).toBe("flux");
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.width).toBe(576);
    expect(result.height).toBe(1024);
    expect(result.buffer).toEqual(validJpegBuffer);
    expect(result.estimatedCostUSD).toBe(0);
    expect(result.retryCount).toBe(0);
    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
  });

  it("should handle HTTP 429 rate limit with retries and eventual success", async () => {
    mockedAxios.get
      .mockRejectedValueOnce({
        response: { status: 429, data: Buffer.from("Rate limited") },
      })
      .mockResolvedValueOnce({
        status: 200,
        data: validJpegBuffer,
        headers: { "content-type": "image/jpeg" },
      });

    const result = await provider.generateImage(mockOptions);

    expect(result.buffer).toEqual(validJpegBuffer);
    expect(result.retryCount).toBe(1);
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  }, 15000);

  it("should throw error when HTTP 5xx persists beyond max retries", async () => {
    mockedAxios.get.mockRejectedValue({
      response: { status: 500, data: Buffer.from("Internal server error") },
    });

    await expect(provider.generateImage(mockOptions)).rejects.toThrow(
      /Pollinations provider error/,
    );
    expect(mockedAxios.get).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  }, 40000);

  it("should throw error for non-image or malformed response", async () => {
    mockedAxios.get.mockResolvedValueOnce({
      status: 200,
      data: Buffer.from("Not an image string response"),
      headers: { "content-type": "text/html" },
    });

    await expect(provider.generateImage(mockOptions)).rejects.toThrow(
      /Pollinations API returned invalid non-image payload/,
    );
  });

  it("should enforce sequential execution queue for concurrent requests", async () => {
    const executionOrder: number[] = [];

    mockedAxios.get.mockImplementation(async () => {
      const currentCall = executionOrder.length + 1;
      executionOrder.push(currentCall);
      await new Promise((r) => setTimeout(r, 50));
      return {
        status: 200,
        data: validJpegBuffer,
        headers: { "content-type": "image/jpeg" },
      };
    });

    const p1 = provider.generateImage(mockOptions);
    const p2 = provider.generateImage(mockOptions);
    const p3 = provider.generateImage(mockOptions);

    await Promise.all([p1, p2, p3]);

    expect(executionOrder).toEqual([1, 2, 3]);
    expect(mockedAxios.get).toHaveBeenCalledTimes(3);
  });
});
