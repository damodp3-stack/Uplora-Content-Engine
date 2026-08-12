import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("brand_profiles")
export class BrandProfile {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workspaceId: string;

  @Column({ default: "Default" })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  tone: string;

  @Column({ type: "text", nullable: true })
  voiceSample: string;

  @Column({ type: "simple-array", nullable: true })
  bannedWords: string[];

  @Column({ type: "simple-array", nullable: true })
  preferredWords: string[];

  @Column({ type: "jsonb", nullable: true })
  audiencePersonas: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
