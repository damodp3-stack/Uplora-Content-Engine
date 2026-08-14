import { LocalStorageProvider } from "./local-storage.provider";
import { S3StorageProvider } from "./s3-storage.provider";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";

describe("Storage Providers (Local & S3)", () => {
  let localProvider: LocalStorageProvider;
  let s3Provider: S3StorageProvider;
  const testDir = path.join(process.cwd(), "scratch", "test-uploads");

  beforeAll(async () => {
    const configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === "STORAGE_LOCAL_DIR") return testDir;
        if (key === "STORAGE_PROVIDER") return "s3";
        if (key === "S3_BUCKET_NAME") return "my-test-bucket";
        return null;
      }),
    } as any;

    localProvider = new LocalStorageProvider(configService);
    s3Provider = new S3StorageProvider(configService);
  });

  afterAll(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe("LocalStorageProvider", () => {
    const testKey = "test-workspace/test-project/hero.png";
    const testBuffer = Buffer.from("fake-png-image-binary-data");

    it("should upload physical file to disk and compute checksum", async () => {
      const meta = await localProvider.upload(testKey, testBuffer, "image/png");

      expect(meta.key).toBe(testKey);
      expect(meta.size).toBe(testBuffer.byteLength);
      expect(meta.checksum).toBeDefined();
      expect(meta.url).toContain("test-workspace/test-project/hero.png");

      const exists = await localProvider.exists(testKey);
      expect(exists).toBe(true);
    });

    it("should download uploaded file cleanly", async () => {
      const downloaded = await localProvider.download(testKey);
      expect(downloaded.toString()).toBe("fake-png-image-binary-data");
    });

    it("should generate valid signed URL", async () => {
      const signedUrl = await localProvider.getSignedUrl(testKey, 3600);
      expect(signedUrl).toContain("expires=");
      expect(signedUrl).toContain("signature=");
    });

    it("should delete uploaded file cleanly", async () => {
      await localProvider.delete(testKey);
      const exists = await localProvider.exists(testKey);
      expect(exists).toBe(false);
    });
  });

  describe("S3StorageProvider", () => {
    const testKey = "ws-123/proj-456/voice.mp3";

    it("should generate S3 upload metadata and signed URL", async () => {
      const meta = await s3Provider.upload(testKey, Buffer.from("voice-data"), "audio/mpeg");
      expect(meta.url).toContain("my-test-bucket");

      const signedUrl = await s3Provider.getSignedUrl(testKey, 1800);
      expect(signedUrl).toContain("X-Amz-Expires=1800");
    });
  });
});
