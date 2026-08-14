import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";
import {
  IMediaStorageProvider,
  StorageObjectMetadata,
} from "./storage-provider.interface";

@Injectable()
export class LocalStorageProvider implements IMediaStorageProvider {
  readonly name = "local";
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly storageDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.storageDir =
      this.configService.get<string>("STORAGE_LOCAL_DIR") ||
      path.join(process.cwd(), "uploads");
    this.baseUrl =
      this.configService.get<string>("STORAGE_BASE_URL") ||
      "http://localhost:3000/uploads";

    // Ensure storage directory exists
    fs.mkdir(this.storageDir, { recursive: true }).catch((err) =>
      this.logger.error(`Failed to create local storage directory: ${err.message}`),
    );
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    metadata?: Record<string, any>,
  ): Promise<StorageObjectMetadata> {
    const filePath = this.getFilePath(key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);

    const checksum = crypto.createHash("sha256").update(data).digest("hex");
    const size = data.byteLength;

    this.logger.log(`✅ Uploaded local storage asset: ${key} (${size} bytes)`);

    return {
      key,
      size,
      mimeType,
      checksum,
      etag: checksum.substring(0, 16),
      lastModified: new Date(),
      url: `${this.baseUrl}/${key.replace(/\\/g, "/")}`,
    };
  }

  async download(key: string): Promise<Buffer> {
    const filePath = this.getFilePath(key);
    try {
      return await fs.readFile(filePath);
    } catch (err) {
      throw new Error(`Local storage file not found: ${key}`);
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    try {
      await fs.unlink(filePath);
      this.logger.log(`Deleted local storage file: ${key}`);
    } catch (err) {
      // Ignore if already deleted
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getSignedUrl(
    key: string,
    expiresInSec: number = 3600,
    operation: "read" | "write" = "read",
  ): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    const token = crypto
      .createHmac("sha256", "local-secret-key")
      .update(`${key}:${expiresAt}:${operation}`)
      .digest("hex");

    return `${this.baseUrl}/${key.replace(/\\/g, "/")}?expires=${expiresAt}&signature=${token}`;
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    const filePath = this.getFilePath(key);
    try {
      const stat = await fs.stat(filePath);
      const data = await fs.readFile(filePath);
      const checksum = crypto.createHash("sha256").update(data).digest("hex");

      return {
        key,
        size: stat.size,
        mimeType: this.guessMimeType(key),
        checksum,
        etag: checksum.substring(0, 16),
        lastModified: stat.mtime,
        url: `${this.baseUrl}/${key.replace(/\\/g, "/")}`,
      };
    } catch {
      throw new Error(`File metadata not found for key: ${key}`);
    }
  }

  private getFilePath(key: string): string {
    const safeKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, "");
    return path.join(this.storageDir, safeKey);
  }

  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    if (ext === ".png") return "image/png";
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".mp4") return "video/mp4";
    if (ext === ".mp3") return "audio/mpeg";
    if (ext === ".wav") return "audio/wav";
    if (ext === ".json") return "application/json";
    return "application/octet-stream";
  }
}
