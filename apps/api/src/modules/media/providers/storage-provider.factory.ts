import { ConfigService } from "@nestjs/config";
import { IMediaStorageProvider } from "./storage-provider.interface";
import { LocalStorageProvider } from "./local-storage.provider";
import { S3StorageProvider } from "./s3-storage.provider";

export const MEDIA_STORAGE_PROVIDER = "MEDIA_STORAGE_PROVIDER";

export function createStorageProvider(
  configService: ConfigService,
): IMediaStorageProvider {
  const providerType = (
    configService.get<string>("STORAGE_PROVIDER") || "local"
  ).toLowerCase();

  if (providerType === "s3" || providerType === "r2" || providerType === "minio") {
    return new S3StorageProvider(configService);
  }

  return new LocalStorageProvider(configService);
}
