import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AIEngineService } from './ai-engine.service';
import { AIEngineController } from './ai-engine.controller';
import { PromptEngineService } from './prompt-engine.service';
import { SchemaValidatorService } from './schema-validator.service';
import { OpenAIProvider } from './providers/openai.provider';
import { OllamaProvider } from './providers/ollama.provider';
import { HuggingFaceProvider } from './providers/huggingface.provider';

@Module({
  imports: [ConfigModule],
  controllers: [AIEngineController],
  providers: [
    AIEngineService,
    PromptEngineService,
    SchemaValidatorService,
    OpenAIProvider,
    OllamaProvider,
    HuggingFaceProvider,
  ],
  exports: [AIEngineService, PromptEngineService, SchemaValidatorService],
})
export class AIEngineModule {}
