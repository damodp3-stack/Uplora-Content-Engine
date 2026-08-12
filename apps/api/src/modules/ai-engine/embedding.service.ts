import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export type EmbeddingModel =
  "bge-m3" | "text-embedding-3-large" | "text-embedding-3-small" | "jina-v5";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  dimensions: number;
  costUSD: number;
  provider: string;
}

@Injectable()
export class EmbeddingService implements OnModuleInit {
  private readonly logger = new Logger(EmbeddingService.name);
  private defaultModel: EmbeddingModel = "bge-m3";

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    if (this.config.get("ai.openai.apiKey")) {
      this.defaultModel = "text-embedding-3-large";
    } else {
      this.defaultModel = "bge-m3";
    }
    this.logger.log(
      `✅ EmbeddingService ready — default model: ${this.defaultModel}`,
    );
  }

  async embed(text: string, model?: EmbeddingModel): Promise<EmbeddingResult> {
    const useModel = model || this.defaultModel;
    const normalized = text.replace(/\s+/g, " ").trim().substring(0, 8192);

    try {
      if (useModel === "bge-m3") {
        return await this.embedWithOllama(normalized, "bge-m3");
      } else if (
        useModel === "text-embedding-3-large" ||
        useModel === "text-embedding-3-small"
      ) {
        return await this.embedWithOpenAI(normalized, useModel);
      }
      return await this.embedWithOllama(normalized, "bge-m3");
    } catch (error) {
      this.logger.warn(
        `Embedding failed with ${useModel}: ${(error as Error).message}. Using fallback.`,
      );
      return this.fallbackEmbed(normalized);
    }
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private async embedWithOllama(
    text: string,
    model: string,
  ): Promise<EmbeddingResult> {
    const baseUrl =
      this.config.get<string>("ai.ollama.baseUrl") || "http://localhost:11434";
    const response = await axios.post(
      `${baseUrl}/api/embeddings`,
      { model, prompt: text },
      { timeout: 30000 },
    );
    const embedding: number[] =
      response.data.embedding || new Array(1024).fill(0.1);
    return {
      embedding,
      model,
      dimensions: embedding.length,
      costUSD: 0,
      provider: "ollama",
    };
  }

  private async embedWithOpenAI(
    text: string,
    model: string,
  ): Promise<EmbeddingResult> {
    const apiKey = this.config.get<string>("ai.openai.apiKey");
    if (!apiKey) throw new Error("OpenAI API key not configured");

    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      { input: text, model },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 30000 },
    );
    const embedding: number[] = response.data.data[0].embedding;
    return {
      embedding,
      model,
      dimensions: embedding.length,
      costUSD: 0.00001,
      provider: "openai",
    };
  }

  private fallbackEmbed(text: string): EmbeddingResult {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(1024).fill(0);
    words.forEach((word) => {
      const hash =
        word.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
        1024;
      embedding[hash] += 1;
    });
    const norm = Math.sqrt(embedding.reduce((s, v) => s + v * v, 0));
    const normalized = norm > 0 ? embedding.map((v) => v / norm) : embedding;
    return {
      embedding: normalized,
      model: "sparse-fallback",
      dimensions: 1024,
      costUSD: 0,
      provider: "local",
    };
  }
}
