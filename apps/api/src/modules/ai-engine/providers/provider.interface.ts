export type ProviderStatus =
  | "AVAILABLE"
  | "UNAVAILABLE"
  | "INVALID_CONFIGURATION"
  | "RATE_LIMITED"
  | "ERROR";

export interface ProviderHealth {
  provider: string;
  status: ProviderStatus;
  message?: string;
}

export interface AIGenerationOutput {
  content: string;
  model: string;
  tokens: number;
  provider: string;
  latencyMs: number;
  estimatedCostUSD: number;
}

export interface IAIProvider {
  readonly name: string;
  getStatus(): Promise<ProviderHealth>;
  generate(
    systemPrompt: string,
    userPrompt: string,
    maxTokens?: number,
  ): Promise<AIGenerationOutput>;
}
