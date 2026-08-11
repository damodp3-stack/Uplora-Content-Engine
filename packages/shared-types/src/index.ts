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

export interface SEOMetadata {
  metaTitle: string;
  metaDescription: string;
  focusKeyword: string;
  secondaryKeywords: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;
  structuredData?: Record<string, any>;
  seoScore: number; // 0 - 100
  readabilityScore: number; // 0 - 100
}

export interface AIMetadata {
  generatedBy: 'openai' | 'anthropic' | 'ollama' | 'huggingface' | 'manual';
  prompt?: string;
  tokensUsed?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  toneAnalysis?: Record<string, number>;
  suggestedHashtags?: string[];
  estimatedReadTime?: number; // minutes
  wordCount?: number;
  fleschScore?: number;
}

export interface SocialVariants {
  twitter?: { text: string; mediaIds?: string[] };
  linkedin?: { text: string; mediaIds?: string[] };
  instagram?: { caption: string; mediaIds?: string[] };
  facebook?: { text: string; mediaIds?: string[] };
  tiktok?: { caption: string; mediaIds?: string[] };
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  body: Record<string, any>;
  plainText?: string;
  htmlContent?: string;
  type: ContentType;
  status: ContentStatus;
  seo?: SEOMetadata;
  aiMetadata?: AIMetadata;
  socialVariants?: SocialVariants;
  platforms?: string[];
  scheduledAt?: string;
  publishedAt?: string;
  featuredImage?: string;
  mediaAttachments?: string[];
  authorId: string;
  workspaceId: string;
  currentVersion: number;
  viewCount: number;
  shareCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  total: number;
  published: number;
  drafts: number;
  scheduled: number;
  recentContent: Array<{ date: string; count: number }>;
  topContent: Array<{
    id: string;
    title: string;
    viewCount: number;
    shareCount: number;
    publishedAt: string;
  }>;
}
