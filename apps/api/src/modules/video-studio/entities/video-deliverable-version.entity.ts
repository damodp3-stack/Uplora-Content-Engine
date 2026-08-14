import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { VideoProject, VideoStage } from "./video-project.entity";

export type VersionStatus = "current" | "superseded" | "stale";

@Entity("video_deliverable_versions")
@Index(["projectId", "stage"])
export class VideoDeliverableVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => VideoProject, (project) => project.deliverableVersions, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "projectId" })
  project: VideoProject;

  @Column({ type: "varchar", length: 100 })
  stage: VideoStage;

  @Column({ type: "int" })
  version: number;

  @Column({ type: "jsonb" })
  content: Record<string, any>;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  generationId: string;

  @Column({ nullable: true, default: "openai" })
  provider: string;

  @Column({ nullable: true, default: "gpt-4o" })
  model: string;

  @Column({ nullable: true, default: "2.0.0" })
  promptVersion: string;

  @Column({ type: "varchar", length: 50, default: "current" })
  status: VersionStatus;

  @Column({ type: "int", nullable: true, default: 0 })
  latencyMs: number;

  @Column({ type: "jsonb", nullable: true })
  tokenUsage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };

  @Column({ type: "jsonb", nullable: true })
  sourceStageVersion: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;
}
