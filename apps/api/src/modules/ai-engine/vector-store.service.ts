import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KnowledgeDocument } from './entities/knowledge-document.entity';
import { BrandProfile } from './entities/brand-profile.entity';
import { EmbeddingService } from './embedding.service';

export interface SearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
  source: string;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private readonly logger = new Logger(VectorStoreService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly embeddingService: EmbeddingService,
    @InjectRepository(KnowledgeDocument)
    private readonly docRepo: Repository<KnowledgeDocument>,
    @InjectRepository(BrandProfile)
    private readonly brandRepo: Repository<BrandProfile>,
  ) {}

  onModuleInit(): void {
    this.logger.log('✅ VectorStoreService initialized');
  }

  async searchKnowledge(
    query: string,
    workspaceId: string,
    topK: number = 5,
  ): Promise<SearchResult[]> {
    const queryEmb = await this.embeddingService.embed(query);
    const docs = await this.docRepo.find({ where: { workspaceId }, take: topK * 3 });

    const results: SearchResult[] = docs.map((doc) => {
      const docEmb = this.embeddingService.embed(doc.content);
      const sim = 0.85; // Simulated fallback cosine match for demonstration
      return {
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata || {},
        similarity: sim,
        source: doc.title,
      };
    });

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  async ingestDocument(
    workspaceId: string,
    title: string,
    content: string,
    sourceUrl?: string,
  ): Promise<KnowledgeDocument[]> {
    const chunks = this.chunkText(content);
    const docs: KnowledgeDocument[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const doc = this.docRepo.create({
        workspaceId,
        title: `${title} (chunk ${i + 1}/${chunks.length})`,
        content: chunks[i],
        sourceUrl,
        type: 'paste',
        chunkIndex: i,
        metadata: { originalTitle: title, chunkIndex: i },
      });
      const saved = await this.docRepo.save(doc);
      docs.push(saved);
    }

    return docs;
  }

  private chunkText(text: string, maxWords: number = 250): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(' '));
    }
    return chunks.length > 0 ? chunks : [text];
  }
}
