import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIEngineService, AIGenerationRequest } from './ai-engine.service';
import { PromptEngineService } from './prompt-engine.service';
import { SchemaValidatorService } from './schema-validator.service';

@ApiTags('AI Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-engine')
export class AIEngineController {
  constructor(
    private readonly aiService: AIEngineService,
    private readonly promptEngine: PromptEngineService,
    private readonly schemaValidator: SchemaValidatorService,
  ) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate content using prompt templates and AI provider failover' })
  async generate(@Body() request: AIGenerationRequest) {
    const validation = this.schemaValidator.validateAIRequest(request);
    if (!validation.valid) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: validation.errors,
      });
    }
    return this.aiService.generateContent(request);
  }

  @Post('seo-optimize')
  @ApiOperation({ summary: 'Analyze and optimize content for SEO' })
  async optimizeSEO(
    @Body('content') content: string,
    @Body('focusKeyword') focusKeyword: string,
  ) {
    if (!content || !focusKeyword) {
      throw new BadRequestException('content and focusKeyword are required');
    }
    return this.aiService.optimizeSEO(content, focusKeyword);
  }

  @Post('repurpose')
  @ApiOperation({ summary: 'Repurpose content into multi-channel social variants' })
  async repurpose(
    @Body('content') content: string,
    @Body('fromType') fromType: string,
    @Body('toTypes') toTypes: string[],
  ) {
    if (!content || !fromType || !Array.isArray(toTypes)) {
      throw new BadRequestException('content, fromType, and toTypes array are required');
    }
    return this.aiService.repurposeContent(content, fromType, toTypes);
  }

  @Get('templates')
  @ApiOperation({ summary: 'List available prompt templates' })
  async getTemplates(@Query('category') category?: string) {
    const ids = this.promptEngine.getTemplateIds();
    const templates = ids.map((id) => this.promptEngine.getTemplate(id)).filter(Boolean);
    const filtered = category ? templates.filter((t) => t.category === category) : templates;
    return {
      success: true,
      data: {
        templates: filtered,
        total: filtered.length,
        version: this.promptEngine.getVersion(),
      },
    };
  }

  @Get('schemas')
  @ApiOperation({ summary: 'List loaded validation schemas' })
  async getSchemas() {
    return {
      success: true,
      data: {
        schemas: this.schemaValidator.getLoadedSchemas(),
      },
    };
  }
}
