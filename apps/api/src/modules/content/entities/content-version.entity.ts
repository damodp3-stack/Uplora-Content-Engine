import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
} from "typeorm";
import { Content } from "./content.entity";
import { User } from "../../auth/entities/user.entity";

@Entity("content_versions")
export class ContentVersion {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "int" })
  versionNumber: number;

  @Column({ type: "jsonb" })
  body: Record<string, any>;

  @Column({ type: "text", nullable: true })
  plainText: string;

  @Column({ type: "jsonb", nullable: true })
  seo: Record<string, any>;

  @Column({ type: "text", nullable: true })
  changeDescription: string;

  @ManyToOne(() => Content, (content) => content.versions, {
    onDelete: "CASCADE",
  })
  content: Content;

  @Column()
  contentId: string;

  @ManyToOne(() => User)
  editedBy: User;

  @Column()
  editedById: string;

  @CreateDateColumn()
  createdAt: Date;
}
