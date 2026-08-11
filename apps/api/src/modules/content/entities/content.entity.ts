import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  UpdateDateColumn, ManyToOne, OneToMany, ManyToMany,
  JoinTable, Index, BeforeInsert, BeforeUpdate,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { ContentVersion } from './content-version.entity';
import { ContentTag } from './content-tag.entity';
import { Workspace } from '../../workspace/entities/workspace.entity';
import slugify from 'slugify';

export enum ContentStatus {
  DRAFT = 'draft',
  IN_REVIEW = 'in_review',
  APPROVED = 'approved',
  SCHEDULED = 'scheduled',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum ContentType {
  BLOG_POST = 'blog_post',
  SOCIAL_POST = 'social_post',
  NEWSLETTER = 'newsletter',
  VIDEO_SCRIPT = 'video_script',
  PODCAST_NOTES = 'podcast_notes',
  THREAD = 'thread',
  CAROUSEL = 'carousel',
  STORY = 'story',
  AD_COPY = 'ad_copy',
  LANDING_PAGE = 'landing_page',
  EMAIL = 'email',
  PRESS_RELEASE = 'press_release',
  PRODUCT_DESCRIPTION = 'product_description',
  CUSTOM = 'custom',
}

@Entity('contents')
@Index(['slug', 'workspaceId'], { unique: true })
@Index(['status', 'scheduledAt'])
@Index(['createdAt'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 500 })
  title: string;

  @Column({ length: 600, unique: false })
  slug: string;

  @Column({ type: 'text', nullable: true })
  excerpt: string;

  @Column({ type: 'jsonb' })
  body: Record<string, any>;

  @Column({ type: 'text', nullable: true })
  plainText: string;

  @Column({ type: 'text', nullable: true })
  htmlContent: string;

  @Column({ type: 'enum', enum: ContentType, default: ContentType.BLOG_POST })
  type: ContentType;

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus;

  // SEO Metadata
  @Column({ type: 'jsonb', nullable: true })
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyword: string;
    secondaryKeywords: string[];
    canonicalUrl?: string;
    ogImage?: string;
    ogTitle?: string;
    ogDescription?: string;
    structuredData?: Record<string, any>;
    seoScore: number;
    readabilityScore: number;
  };

  // AI Metadata
  @Column({ type: 'jsonb', nullable: true })
  aiMetadata: {
    generatedBy: string;
    prompt?: string;
    tokensUsed?: number;
    sentiment?: string;
    toneAnalysis?: Record<string, number>;
    suggestedHashtags?: string[];
    estimatedReadTime?: number;
    wordCount?: number;
    fleschScore?: number;
  };

  // Social Variants
  @Column({ type: 'jsonb', nullable: true })
  socialVariants: {
    twitter?: { text: string; mediaIds?: string[] };
    linkedin?: { text: string; mediaIds?: string[] };
    instagram?: { caption: string; mediaIds?: string[] };
    facebook?: { text: string; mediaIds?: string[] };
    tiktok?: { caption: string; mediaIds?: string[] };
  };

  @Column({ type: 'simple-array', nullable: true })
  platforms: string[];

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @Column({ nullable: true })
  featuredImage: string;

  @Column({ type: 'simple-array', nullable: true })
  mediaAttachments: string[];

  @ManyToOne(() => User, (user) => user.contents, { eager: true })
  author: User;

  @Column()
  authorId: string;

  @ManyToOne(() => Workspace, (ws) => ws.contents)
  workspace: Workspace;

  @Column()
  workspaceId: string;

  @OneToMany(() => ContentVersion, (version) => version.content, {
    cascade: true,
  })
  versions: ContentVersion[];

  @ManyToMany(() => ContentTag, (tag) => tag.contents, {
    cascade: true,
    eager: true,
  })
  @JoinTable({
    name: 'content_tags_junction',
    joinColumn: { name: 'contentId' },
    inverseJoinColumn: { name: 'tagId' },
  })
  tags: ContentTag[];

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'int', default: 0 })
  shareCount: number;

  @Column({ type: 'int', default: 1 })
  currentVersion: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  generateSlug() {
    if (this.title) {
      this.slug = slugify(this.title, {
        lower: true,
        strict: true,
        trim: true,
      });
    }
  }

  @BeforeInsert()
  @BeforeUpdate()
  calculateMetrics() {
    if (this.plainText) {
      const wordCount = this.plainText.split(/\s+/).filter(Boolean).length;
      if (!this.aiMetadata) this.aiMetadata = {} as any;
      this.aiMetadata.wordCount = wordCount;
      this.aiMetadata.estimatedReadTime = Math.ceil(wordCount / 200);
    }
  }
}
