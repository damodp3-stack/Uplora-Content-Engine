import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AIEngineService } from './ai-engine.service';
import { AIEngineController } from './ai-engine.controller';
import { PromptEngineService } from './prompt-engine.service';
import { SchemaValidatorService } from './schema-validator.service';
import { ImageGenerationService } from './image-generation.service';
import { EmbeddingService } from './embedding.service';
import { VectorStoreService } from './vector-store.service';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { HuggingFaceProvider } from './providers/huggingface.provider';
import { BrandProfile } from './entities/brand-profile.entity';
import { KnowledgeDocument } from './entities/knowledge-document.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([BrandProfile, KnowledgeDocument]),
  ],
  controllers: [AIEngineController],
  providers: [
    AIEngineService,
    PromptEngineService,
    SchemaValidatorService,
    ImageGenerationService,
    EmbeddingService,
    VectorStoreService,
    OpenAIProvider,
    OllamaProvider,
    HuggingFaceProvider,
  ],
  exports: [
    AIEngineService,
    PromptEngineService,
    SchemaValidatorService,
    ImageGenerationService,
    EmbeddingService,
    VectorStoreService,
  ],
})
export class AIEngineModule {}
