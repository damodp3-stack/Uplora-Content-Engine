import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
  Index,
} from "typeorm";
import { Content } from "./content.entity";

@Entity("content_tags")
@Index(["name", "workspaceId"], { unique: true })
export class ContentTag {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  name: string;

  @Column()
  workspaceId: string;

  @ManyToMany(() => Content, (content) => content.tags)
  contents: Content[];

  @CreateDateColumn()
  createdAt: Date;
}
