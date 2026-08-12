import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Content } from "../../content/entities/content.entity";

export enum UserRole {
  ADMIN = "admin",
  EDITOR = "editor",
  CREATOR = "creator",
  VIEWER = "viewer",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column()
  fullName: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.CREATOR })
  role: UserRole;

  @Column({ default: "default-workspace" })
  activeWorkspaceId: string;

  @OneToMany(() => Content, (content) => content.author)
  contents: Content[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
