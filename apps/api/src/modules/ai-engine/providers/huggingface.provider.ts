import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class HuggingFaceProvider {
  private readonly logger = new Logger(HuggingFaceProvider.name);

  constructor(private readonly config: ConfigService) {}

  async generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number = 1000,
  ): Promise<{ content: string; model: string; tokens: number }> {
    const apiKey = this.config.get<string>('ai.huggingfaceApiKey');

    if (!apiKey) {
      return {
        content: `[HuggingFace Free Model Output]\nProcessed prompt: ${userPrompt.substring(0, 150)}...`,
        model: 'hf-mistral-7b-mock',
        tokens: 120,
      };
    }

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2',
        {
          inputs: `<s>[INST] ${systemPrompt}\n${userPrompt} [/INST]`,
          parameters: { max_new_tokens: maxTokens },
        },
        {
          headers: { Authorization: `Bearer ${apiKey}` },
        },
      );

      const generated = response.data[0]?.generated_text || '';
      return {
        content: generated.replace(`<s>[INST] ${systemPrompt}\n${userPrompt} [/INST]`, '').trim(),
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        tokens: 300,
      };
    } catch (error) {
      this.logger.error(`HuggingFace generation error: ${error.message}`);
      throw error;
    }
  }
}
