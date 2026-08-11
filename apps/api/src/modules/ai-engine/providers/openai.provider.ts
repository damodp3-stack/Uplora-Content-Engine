import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class OpenAIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 2000,
  ): Promise<{ content: string; model: string; tokens: number }> {
    const apiKey = this.config.get<string>('ai.openaiApiKey');

    if (!apiKey) {
      this.logger.warn('OpenAI API Key is missing. Returning template response.');
      return {
        content: `[OpenAI Sample Content]\n${userPrompt.substring(0, 300)}...`,
        model: 'gpt-4o-mini-mock',
        tokens: 150,
      };
    }

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const choice = response.data.choices[0];
      return {
        content: choice.message.content.trim(),
        model: response.data.model || 'gpt-4o-mini',
        tokens: response.data.usage?.total_tokens || 200,
      };
    } catch (error) {
      this.logger.error(`OpenAI generation error: ${error.message}`);
      throw error;
    }
  }
}
