export interface StorageObjectMetadata {
  key: string;
  size: number;
  mimeType: string;
  checksum?: string;
  etag?: string;
  lastModified?: Date;
  url?: string;
}

export interface IMediaStorageProvider {
  readonly name: string;

  upload(
    key: string,
    data: Buffer | Uint8Array,
    mimeType: string,
    metadata?: Record<string, any>,
  ): Promise<StorageObjectMetadata>;

  download(key: string): Promise<Buffer>;

  delete(key: string): Promise<void>;

  exists(key: string): Promise<boolean>;

  getSignedUrl(
    key: string,
    expiresInSec?: number,
    operation?: "read" | "write",
  ): Promise<string>;

  getMetadata(key: string): Promise<StorageObjectMetadata>;
}
