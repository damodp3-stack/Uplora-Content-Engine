import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  Inject,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, ILike, FindOptionsWhere } from "typeorm";
import { Content, ContentStatus, ContentType } from "./entities/content.entity";
import { ContentVersion } from "./entities/content-version.entity";
import { ContentTag } from "./entities/content-tag.entity";
import { CreateContentDto } from "./dto/create-content.dto";
import { UpdateContentDto } from "./dto/update-content.dto";
import { QueryContentDto } from "./dto/query-content.dto";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";

@Injectable()
export class ContentService {
  private readonly logger = new Logger(ContentService.name);

  constructor(
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,

    @InjectRepository(ContentVersion)
    private readonly versionRepo: Repository<ContentVersion>,

    @InjectRepository(ContentTag)
    private readonly tagRepo: Repository<ContentTag>,

    @Inject(CACHE_MANAGER)
    private readonly cache: Cache,

    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    dto: CreateContentDto,
    userId: string,
    workspaceId: string,
  ): Promise<Content> {
    try {
      const tags = await this.processTags(dto.tags || [], workspaceId);

      const content = this.contentRepo.create({
        ...dto,
        authorId: userId,
        workspaceId,
        tags,
        plainText: this.extractPlainText(dto.body),
        htmlContent: this.renderHTML(dto.body),
        currentVersion: 1,
      });

      const saved = await this.contentRepo.save(content);

      await this.createVersion(saved, userId, "Initial creation");

      this.eventEmitter.emit("content.created", {
        contentId: saved.id,
        userId,
        workspaceId,
      });

      this.logger.log(`Content created: ${saved.id} by user ${userId}`);
      return saved;
    } catch (error) {
      this.logger.error(
        `Failed to create content: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        `Failed to create content: ${error.message}`,
      );
    }
  }

  async findAll(
    query: QueryContentDto,
    workspaceId: string,
  ): Promise<{ data: Content[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      tags,
      authorId,
      sortBy = "createdAt",
      sortOrder = "DESC",
      dateFrom,
      dateTo,
    } = query;

    const cacheKey = `content:list:${workspaceId}:${JSON.stringify(query)}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached as any;

    const qb = this.contentRepo
      .createQueryBuilder("content")
      .leftJoinAndSelect("content.author", "author")
      .leftJoinAndSelect("content.tags", "tags")
      .where("content.workspaceId = :workspaceId", { workspaceId })
      .andWhere("content.deletedAt IS NULL");

    if (search) {
      qb.andWhere(
        "(content.title ILIKE :search OR content.plainText ILIKE :search)",
        { search: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere("content.status = :status", { status });
    }

    if (type) {
      qb.andWhere("content.type = :type", { type });
    }

    if (authorId) {
      qb.andWhere("content.authorId = :authorId", { authorId });
    }

    if (dateFrom && dateTo) {
      qb.andWhere("content.createdAt BETWEEN :dateFrom AND :dateTo", {
        dateFrom,
        dateTo,
      });
    }

    if (tags && tags.length > 0) {
      qb.andWhere("tags.name IN (:...tags)", { tags });
    }

    qb.orderBy(`content.${sortBy}`, sortOrder as "ASC" | "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    const result = { data, total, page, limit };
    await this.cache.set(cacheKey, result, 60);

    return result;
  }

  async findOne(id: string, workspaceId: string): Promise<Content> {
    const cacheKey = `content:${id}`;
    const cached = await this.cache.get<Content>(cacheKey);
    if (cached) return cached;

    const content = await this.contentRepo.findOne({
      where: { id, workspaceId, deletedAt: null as any },
      relations: ["author", "tags", "versions"],
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found`);
    }

    await this.cache.set(cacheKey, content, 120);
    return content;
  }

  async update(
    id: string,
    dto: UpdateContentDto,
    userId: string,
    workspaceId: string,
  ): Promise<Content> {
    const content = await this.findOne(id, workspaceId);

    if (dto.tags) {
      content.tags = await this.processTags(dto.tags, workspaceId);
    }

    Object.assign(content, {
      ...dto,
      plainText: dto.body ? this.extractPlainText(dto.body) : content.plainText,
      htmlContent: dto.body ? this.renderHTML(dto.body) : content.htmlContent,
      currentVersion: content.currentVersion + 1,
    });

    const saved = await this.contentRepo.save(content);

    await this.createVersion(saved, userId, dto.changeDescription || "Updated");
    await this.invalidateCache(id, workspaceId);

    this.eventEmitter.emit("content.updated", {
      contentId: saved.id,
      userId,
    });

    return saved;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const content = await this.findOne(id, workspaceId);
    content.deletedAt = new Date();
    await this.contentRepo.save(content);
    await this.invalidateCache(id, workspaceId);
  }

  async publish(id: string, workspaceId: string): Promise<Content> {
    const content = await this.findOne(id, workspaceId);
    content.status = ContentStatus.PUBLISHED;
    content.publishedAt = new Date();
    const saved = await this.contentRepo.save(content);

    this.eventEmitter.emit("content.published", { contentId: saved.id });
    await this.invalidateCache(id, workspaceId);

    return saved;
  }

  async schedule(
    id: string,
    scheduledAt: Date,
    workspaceId: string,
  ): Promise<Content> {
    const content = await this.findOne(id, workspaceId);

    if (new Date(scheduledAt) <= new Date()) {
      throw new BadRequestException("Scheduled time must be in the future");
    }

    content.status = ContentStatus.SCHEDULED;
    content.scheduledAt = scheduledAt;
    const saved = await this.contentRepo.save(content);

    this.eventEmitter.emit("content.scheduled", {
      contentId: saved.id,
      scheduledAt,
    });

    return saved;
  }

  async getVersionHistory(
    contentId: string,
    workspaceId: string,
  ): Promise<ContentVersion[]> {
    await this.findOne(contentId, workspaceId);

    return this.versionRepo.find({
      where: { contentId },
      order: { versionNumber: "DESC" },
      relations: ["editedBy"],
    });
  }

  async restoreVersion(
    contentId: string,
    versionId: string,
    userId: string,
    workspaceId: string,
  ): Promise<Content> {
    const content = await this.findOne(contentId, workspaceId);
    const version = await this.versionRepo.findOne({
      where: { id: versionId, contentId },
    });

    if (!version) {
      throw new NotFoundException("Version not found");
    }

    content.body = version.body;
    content.plainText = version.plainText;
    content.seo = version.seo as any;
    content.currentVersion += 1;

    const saved = await this.contentRepo.save(content);
    await this.createVersion(
      saved,
      userId,
      `Restored from version ${version.versionNumber}`,
    );

    return saved;
  }

  async getDashboardStats(workspaceId: string) {
    const cacheKey = `stats:${workspaceId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [total, published, drafts, scheduled] = await Promise.all([
      this.contentRepo.count({
        where: { workspaceId, deletedAt: null as any },
      }),
      this.contentRepo.count({
        where: {
          workspaceId,
          status: ContentStatus.PUBLISHED,
          deletedAt: null as any,
        },
      }),
      this.contentRepo.count({
        where: {
          workspaceId,
          status: ContentStatus.DRAFT,
          deletedAt: null as any,
        },
      }),
      this.contentRepo.count({
        where: {
          workspaceId,
          status: ContentStatus.SCHEDULED,
          deletedAt: null as any,
        },
      }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentContent = await this.contentRepo
      .createQueryBuilder("c")
      .select("DATE_TRUNC('day', c.createdAt)", "date")
      .addSelect("COUNT(*)", "count")
      .where("c.workspaceId = :workspaceId", { workspaceId })
      .andWhere("c.createdAt >= :from", { from: thirtyDaysAgo })
      .groupBy("DATE_TRUNC('day', c.createdAt)")
      .orderBy("date", "ASC")
      .getRawMany();

    const topContent = await this.contentRepo.find({
      where: { workspaceId, status: ContentStatus.PUBLISHED },
      order: { viewCount: "DESC" },
      take: 5,
      select: ["id", "title", "viewCount", "shareCount", "publishedAt"],
    });

    const stats = {
      total,
      published,
      drafts,
      scheduled,
      recentContent,
      topContent,
    };

    await this.cache.set(cacheKey, stats, 300);
    return stats;
  }

  private async createVersion(
    content: Content,
    userId: string,
    description: string,
  ): Promise<ContentVersion> {
    const version = this.versionRepo.create({
      contentId: content.id,
      versionNumber: content.currentVersion,
      body: content.body,
      plainText: content.plainText,
      seo: content.seo,
      changeDescription: description,
      editedById: userId,
    });
    return this.versionRepo.save(version);
  }

  private async processTags(
    tagNames: string[],
    workspaceId: string,
  ): Promise<ContentTag[]> {
    const tags: ContentTag[] = [];

    for (const name of tagNames) {
      const normalized = name.toLowerCase().trim();
      let tag = await this.tagRepo.findOne({
        where: { name: normalized, workspaceId },
      });

      if (!tag) {
        tag = this.tagRepo.create({ name: normalized, workspaceId });
        tag = await this.tagRepo.save(tag);
      }

      tags.push(tag);
    }

    return tags;
  }

  private extractPlainText(body: Record<string, any>): string {
    if (!body || !body.content) return typeof body === "string" ? body : "";
    return this.walkNodes(body.content);
  }

  private walkNodes(nodes: any[]): string {
    let text = "";
    for (const node of nodes) {
      if (node.type === "text") {
        text += node.text + " ";
      }
      if (node.content) {
        text += this.walkNodes(node.content);
      }
    }
    return text.trim();
  }

  private renderHTML(body: Record<string, any>): string {
    return JSON.stringify(body);
  }

  private async invalidateCache(
    contentId: string,
    workspaceId: string,
  ): Promise<void> {
    await this.cache.del(`content:${contentId}`);
    await this.cache.del(`stats:${workspaceId}`);
  }
}
