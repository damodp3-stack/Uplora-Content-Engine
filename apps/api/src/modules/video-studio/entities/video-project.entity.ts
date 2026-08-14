import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { VideoShot } from "./video-shot.entity";
import { VideoDeliverableVersion } from "./video-deliverable-version.entity";

export enum VideoStage {
  IDEA_ANALYSIS = "idea_analysis",
  RESEARCH = "research",
  STRATEGY = "strategy",
  SCRIPTING = "scripting",
  STORYBOARDING = "storyboarding",
  VISUAL_DESIGN = "visual_design",
  CHARACTER_DESIGN = "character_design",
  SHOT_GENERATION = "shot_generation",
  VOICE_SYNTHESIS = "voice_synthesis",
  AUDIO_MIXING = "audio_mixing",
  VIDEO_ASSEMBLY = "video_assembly",
  QUALITY_CONTROL = "quality_control",
  REFINEMENT = "refinement",
  COMPLETED = "completed",
  FAILED = "failed",
}

export type StageStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "retrying"
  | "skipped"
  | "stale";

@Entity("video_projects")
export class VideoProject {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  authorId: string;

  @Column({ length: 500 })
  title: string;

  @Column({ type: "text" })
  rawPrompt: string;

  @Column({ default: "instagram_reels" })
  targetPlatform: string;

  @Column({ type: "int", default: 30 })
  targetDurationSec: number;

  @Column({ default: "english" })
  scriptLanguage: string;

  @Column({ default: "english" })
  voiceLanguage: string;

  @Column({ default: "english" })
  subtitleLanguage: string;

  @Column({
    type: "enum",
    enum: VideoStage,
    default: VideoStage.IDEA_ANALYSIS,
  })
  currentStage: VideoStage;

  @Column({ type: "int", default: 0 })
  stageProgressPercent: number;

  @Column({ type: "int", default: 0 })
  overallProgressPercent: number;

  @Column({ type: "jsonb", nullable: true })
  stageStatuses: Record<string, StageStatus>;

  @Column({ type: "jsonb", nullable: true })
  concept: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  research: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  script: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  storyboard: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  visualBible: Record<string, any>;

  @Column({ type: "jsonb", nullable: true })
  qcResult: Record<string, any>;

  @Column({ nullable: true })
  finalVideoUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ nullable: true })
  srtSubtitleUrl: string;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  estimatedCostUSD: number;

  @Column({ type: "decimal", precision: 10, scale: 4, default: 0 })
  actualCostUSD: number;

  @Column({ type: "jsonb", nullable: true })
  retryCounts: Record<string, number>;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @OneToMany(() => VideoShot, (shot) => shot.project, { cascade: true })
  shots: VideoShot[];

  @OneToMany(() => VideoDeliverableVersion, (ver) => ver.project, {
    cascade: true,
  })
  deliverableVersions: VideoDeliverableVersion[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
