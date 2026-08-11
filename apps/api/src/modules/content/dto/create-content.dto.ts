import {
  IsString, IsEnum, IsOptional, IsArray, IsObject, IsDateString, Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentType, ContentStatus } from '../entities/content.entity';

export class CreateContentDto {
  @ApiProperty({ description: 'Content Title', example: '10 AI Productivity Hacks for 2026' })
  @IsString()
  @Length(1, 500)
  title: string;

  @ApiPropertyOptional({ description: 'Short summary' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiProperty({ description: 'Content body in JSON/TipTap format' })
  @IsObject()
  body: Record<string, any>;

  @ApiPropertyOptional({ enum: ContentType, default: ContentType.BLOG_POST })
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'List of tags' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'SEO Configuration' })
  @IsOptional()
  @IsObject()
  seo?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Social Media Post Variants' })
  @IsOptional()
  @IsObject()
  socialVariants?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Platforms to publish to' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];

  @ApiPropertyOptional({ description: 'Scheduled Publishing Time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: Date;

  @ApiPropertyOptional({ description: 'Featured Image URL' })
  @IsOptional()
  @IsString()
  featuredImage?: string;
}
