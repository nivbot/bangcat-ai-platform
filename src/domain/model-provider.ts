export interface TextModelRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface TextModelResult {
  /** Raw model output; expected to be a JSON string for structured tasks. */
  outputText: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
}

export interface ImageModelRequest {
  prompt: string;
  negativePrompt?: string;
  size?: string;
}

export interface ImageModelResult {
  /** Storage key or URL of the produced image asset. */
  assetRef: string;
  model: string;
  durationMs: number;
}

export interface TextModelProvider {
  readonly name: string;
  readonly model: string;
  generateText(request: TextModelRequest): Promise<TextModelResult>;
}

export interface ImageModelProvider {
  readonly name: string;
  readonly model: string;
  generateImage(request: ImageModelRequest): Promise<ImageModelResult>;
}

export class ModelProviderError extends Error {
  constructor(
    message: string,
    readonly code: 'provider_error' | 'timeout' | 'invalid_output' | 'not_configured',
  ) {
    super(message);
  }
}

/** Rough CNY-per-1K-token rates used for cost attribution in the MVP. */
export function estimateTextCostCny(
  provider: string,
  _model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  if (provider === 'mock') return 0;
  const cost = (promptTokens * 0.002 + completionTokens * 0.006) / 1000;
  return Math.round(cost * 1_000_000) / 1_000_000;
}
