import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export enum AssetType {
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  VOICE = "VOICE",
  MUSIC = "MUSIC",
  SFX = "SFX",
  CAPTION = "CAPTION",
  FINAL_RENDER = "FINAL_RENDER",
}

export enum AssetStatus {
  PLANNED = "PLANNED",
  GENERATING = "GENERATING",
  UPLOADING = "UPLOADING",
  AVAILABLE = "AVAILABLE",
  FAILED = "FAILED",
  SUPERSEDED = "SUPERSEDED",
  DELETED = "DELETED",
}

@Entity("media_assets")
export class MediaAsset {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  @Index()
  workspaceId!: string;

  @Column()
  @Index()
  projectId!: string;

  @Column({ nullable: true })
  @Index()
  shotId?: string;

  @Column({
    type: "enum",
    enum: AssetType,
    default: AssetType.IMAGE,
  })
  assetType!: AssetType;

  @Column({
    type: "enum",
    enum: AssetStatus,
    default: AssetStatus.PLANNED,
  })
  status!: AssetStatus;

  @Column({ default: "local" })
  provider!: string;

  @Column()
  storageKey!: string;

  @Column({ nullable: true })
  mimeType?: string;

  @Column({ type: "bigint", default: 0 })
  size!: number;

  @Column({ nullable: true })
  checksum?: string;

  @Column({ type: "int", nullable: true })
  width?: number;

  @Column({ type: "int", nullable: true })
  height?: number;

  @Column({ type: "float", nullable: true })
  duration?: number;

  @Column({ type: "int", default: 1 })
  version!: number;

  @Column({ nullable: true })
  parentAssetId?: string;

  @Column({ type: "simple-json", nullable: true })
  generationMetadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
