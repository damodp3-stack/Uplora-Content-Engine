import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AIEngineService, AIGenerationRequest } from './ai-engine.service';

@ApiTags('AI Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai-engine')
export class AIEngineController {
  constructor(private readonly aiEngineService: AIEngineService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate high-quality content using specified AI provider' })
  async generate(@Body() request: AIGenerationRequest) {
    return this.aiEngineService.generateContent(request);
  }

  @Post('seo-optimize')
  @ApiOperation({ summary: 'Analyze content and get SEO optimization suggestions' })
  async optimizeSEO(
    @Body('content') content: string,
    @Body('focusKeyword') focusKeyword: string,
  ) {
    return this.aiEngineService.optimizeSEO(content, focusKeyword);
  }

  @Post('repurpose')
  @ApiOperation({ summary: 'Repurpose content into multi-channel social variants' })
  async repurpose(
    @Body('content') content: string,
    @Body('fromType') fromType: string,
    @Body('toTypes') toTypes: string[],
  ) {
    return this.aiEngineService.repurposeContent(content, fromType, toTypes);
  }
}
