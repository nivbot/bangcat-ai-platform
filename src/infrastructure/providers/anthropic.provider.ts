import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelProviderError } from '../../domain/model-provider.js';
import type {
  TextModelProvider,
  TextModelRequest,
  TextModelResult,
} from '../../domain/model-provider.js';

interface AnthropicMessagesResponse {
  model?: string;
  content?: Array<{ type: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

/**
 * Anthropic Messages API provider. Enabled only when
 * TEXT_PROVIDER=anthropic and ANTHROPIC_API_KEY are configured.
 */
@Injectable()
export class AnthropicTextProvider implements TextModelProvider {
  readonly name = 'anthropic';
  readonly model: string;
  private readonly logger = new Logger(AnthropicTextProvider.name);

  constructor(private readonly config: ConfigService) {
    this.model = config.get<string>('providers.textModel') ?? 'claude-sonnet-4-6';
  }

  async generateText(request: TextModelRequest): Promise<TextModelResult> {
    const apiKey = this.config.get<string>('providers.anthropicApiKey') ?? '';
    if (!apiKey) throw new ModelProviderError('anthropic api key is not configured', 'not_configured');
    const timeoutMs = this.config.get<number>('providers.modelTimeoutMs') ?? 60_000;
    const started = Date.now();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: request.maxTokens ?? 4096,
          temperature: request.temperature ?? 0.7,
          system: request.systemPrompt,
          messages: [{ role: 'user', content: request.userPrompt }],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (controller.signal.aborted) throw new ModelProviderError('model call timed out', 'timeout');
      throw new ModelProviderError(`model call failed: ${String(error)}`, 'provider_error');
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      this.logger.warn(`anthropic responded ${response.status}: ${body.slice(0, 200)}`);
      throw new ModelProviderError(`provider responded ${response.status}`, 'provider_error');
    }
    const payload = (await response.json()) as AnthropicMessagesResponse;
    const text = (payload.content ?? [])
      .filter((block) => block.type === 'text' && typeof block.text === 'string')
      .map((block) => block.text)
      .join('');
    if (!text) throw new ModelProviderError('provider returned empty content', 'invalid_output');
    return {
      outputText: text,
      model: payload.model ?? this.model,
      promptTokens: payload.usage?.input_tokens ?? 0,
      completionTokens: payload.usage?.output_tokens ?? 0,
      durationMs: Date.now() - started,
    };
  }
}
