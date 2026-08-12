import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type KnowledgeDocType = "file" | "url" | "notion" | "gdocs" | "paste";

@Entity("knowledge_documents")
export class KnowledgeDocument {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  workspaceId: string;

  @Column()
  title: string;

  @Column({ type: "text" })
  content: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ default: "paste" })
  type: KnowledgeDocType;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "int", default: 0 })
  chunkIndex: number;

  @Column({ nullable: true })
  parentDocId: string;

  @CreateDateColumn()
  createdAt: Date;
}
