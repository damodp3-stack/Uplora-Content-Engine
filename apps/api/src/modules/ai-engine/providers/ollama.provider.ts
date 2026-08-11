import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OllamaProvider {
  private readonly logger = new Logger(OllamaProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2000,
  ): Promise<{ content: string; model: string; tokens: number }> {
    const baseUrl = this.config.get<string>('ai.ollamaBaseUrl') || 'http://localhost:11434';
    const model = this.config.get<string>('ai.ollamaModel') || 'llama3';

    try {
      const response = await axios.post(
        `${baseUrl}/api/generate`,
        {
          model,
          prompt: `${systemPrompt}\n\nUser Request: ${userPrompt}`,
          stream: false,
          options: {
            num_predict: maxTokens,
          },
        },
        { timeout: 30000 },
      );

      return {
        content: response.data.response.trim(),
        model: `ollama/${model}`,
        tokens: response.data.eval_count || 150,
      };
    } catch (error) {
      this.logger.warn(`Ollama provider unavailable at ${baseUrl}: ${error.message}`);
      return {
        content: `🚀 [Ollama Free Local AI Engine]\n\nKey Insights:\n1. Engaging opening hook to grab audience attention.\n2. In-depth analysis of requested topic with actionable points.\n3. Powerful conclusion and call-to-action.\n\nPrompt details processed: ${userPrompt.substring(0, 100)}`,
        model: `ollama/${model}-mock`,
        tokens: 250,
      };
    }
  }
}
