import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { VideoProject } from "./video-project.entity";

export type ShotStatus = "pending" | "generating" | "completed" | "failed";

@Entity("video_shots")
export class VideoShot {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => VideoProject, (project) => project.shots, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "projectId" })
  project: VideoProject;

  @Column({ type: "int" })
  shotNumber: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 3.0 })
  durationSec: number;

  @Column({ type: "text", nullable: true })
  narration: string;

  @Column({ type: "text", nullable: true })
  visualDescription: string;

  @Column({ nullable: true })
  cameraMovement: string;

  @Column({ nullable: true })
  cameraAngle: string;

  @Column({ default: "pending" })
  status: ShotStatus;

  @Column({ nullable: true })
  videoUrl: string;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @Column({ type: "text", nullable: true })
  generationPrompt: string;

  @Column({ nullable: true })
  seed: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
