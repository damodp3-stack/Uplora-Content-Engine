import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  IMediaStorageProvider,
  StorageObjectMetadata,
} from "./storage-provider.interface";

@Injectable()
export class S3StorageProvider implements IMediaStorageProvider {
  readonly name: string;
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly bucketName: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly accessKeyId: string;
  private readonly secretAccessKey: string;

  constructor(private readonly configService: ConfigService) {
    this.name = this.configService.get<string>("STORAGE_PROVIDER") || "s3";
    this.bucketName =
      this.configService.get<string>("S3_BUCKET_NAME") || "uplora-media-assets";
    this.region = this.configService.get<string>("S3_REGION") || "us-east-1";
    this.endpoint = this.configService.get<string>("S3_ENDPOINT");
    this.accessKeyId =
      this.configService.get<string>("S3_ACCESS_KEY_ID") || "mock-access-key";
    this.secretAccessKey =
      this.configService.get<string>("S3_SECRET_ACCESS_KEY") || "mock-secret-key";
  }

  async upload(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    metadata?: Record<string, any>,
  ): Promise<StorageObjectMetadata> {
    const checksum = crypto.createHash("sha256").update(data).digest("hex");
    const size = data.byteLength;

    this.logger.log(`Uploaded asset to ${this.name} storage: ${key} (${size} bytes)`);

    const baseUrl = this.endpoint
      ? `${this.endpoint}/${this.bucketName}`
      : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;

    return {
      key,
      size,
      mimeType,
      checksum,
      etag: checksum.substring(0, 16),
      lastModified: new Date(),
      url: `${baseUrl}/${key}`,
    };
  }

  async download(key: string): Promise<Buffer> {
    this.logger.log(`Downloading asset from ${this.name} storage: ${key}`);
    return Buffer.from(`mock-content-for-${key}`);
  }

  async delete(key: string): Promise<void> {
    this.logger.log(`Deleted asset from ${this.name} storage: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    return true;
  }

  async getSignedUrl(
    key: string,
    expiresInSec: number = 3600,
    operation: "read" | "write" = "read",
  ): Promise<string> {
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSec;
    const baseUrl = this.endpoint
      ? `${this.endpoint}/${this.bucketName}`
      : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;

    return `${baseUrl}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Expires=${expiresInSec}&op=${operation}`;
  }

  async getMetadata(key: string): Promise<StorageObjectMetadata> {
    const baseUrl = this.endpoint
      ? `${this.endpoint}/${this.bucketName}`
      : `https://${this.bucketName}.s3.${this.region}.amazonaws.com`;

    return {
      key,
      size: 1024,
      mimeType: "image/png",
      checksum: "mock-checksum-sha256",
      etag: "mock-etag",
      lastModified: new Date(),
      url: `${baseUrl}/${key}`,
    };
  }
}
