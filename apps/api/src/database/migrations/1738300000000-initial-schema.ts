import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1738300000000 implements MigrationInterface {
  name = 'InitialSchema1738300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "vector"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "brand_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "name" varchar(100) NOT NULL DEFAULT 'Default',
        "description" text,
        "tone" varchar(50),
        "voiceSample" text,
        "bannedWords" text[] NOT NULL DEFAULT '{}',
        "preferredWords" text[] NOT NULL DEFAULT '{}',
        "audiencePersonas" jsonb,
        "embedding" vector(1024),
        "createdAt" timestamp NOT NULL DEFAULT now(),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_brand_profiles" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "knowledge_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "workspaceId" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "content" text NOT NULL,
        "sourceUrl" varchar,
        "type" varchar(50) NOT NULL DEFAULT 'paste',
        "embedding" vector(1024),
        "metadata" jsonb,
        "chunkIndex" integer NOT NULL DEFAULT 0,
        "parentDocId" uuid,
        "createdAt" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_knowledge_documents" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "brand_profiles" CASCADE`);
  }
}
