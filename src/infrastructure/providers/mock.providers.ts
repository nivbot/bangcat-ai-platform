import { Injectable } from '@nestjs/common';
import type {
  ImageModelProvider,
  ImageModelRequest,
  ImageModelResult,
  TextModelProvider,
  TextModelRequest,
  TextModelResult,
} from '../../domain/model-provider.js';

/**
 * Deterministic in-repo provider for local development and CI. It produces
 * schema-valid structured output without any network or credential needs.
 * Clearly marked as mock everywhere it is persisted (provider = "mock").
 */
@Injectable()
export class MockTextProvider implements TextModelProvider {
  readonly name = 'mock';
  readonly model = 'mock-text-v1';

  async generateText(request: TextModelRequest): Promise<TextModelResult> {
    const started = Date.now();
    const outputText = this.buildOutput(request);
    return {
      outputText,
      model: this.model,
      promptTokens: Math.ceil((request.systemPrompt.length + request.userPrompt.length) / 4),
      completionTokens: Math.ceil(outputText.length / 4),
      durationMs: Date.now() - started,
    };
  }

  private buildOutput(request: TextModelRequest): string {
    if (request.systemPrompt.includes('reference-analysis')) {
      return JSON.stringify({
        schemaVersion: 'reference-analysis/v1',
        titleFunction: ['制造反差悬念', '承诺情感回报'],
        narrativeBeats: ['先建立距离感或反差前提', '给出意外的转折瞬间', '落到领养或关注行动'],
        emotionCurve: ['平静', '意外', '温暖'],
        visualGrammar: ['中远景展示独处状态', '特写捕捉互动瞬间', '低饱和暖色调'],
        interactionMechanism: '评论区征集同类瞬间',
        prohibitedElements: ['不复制原文措辞', '不复刻连续镜头', '不使用原案例专有时间地点'],
        sourceSpecificElements: [],
      });
    }
    throw new Error(`mock provider has no fixture for this prompt kind`);
  }
}

@Injectable()
export class MockImageProvider implements ImageModelProvider {
  readonly name = 'mock';
  readonly model = 'mock-image-v1';

  generateImage(request: ImageModelRequest): Promise<ImageModelResult> {
    const started = Date.now();
    const key = `mock/generated-images/${Buffer.from(request.prompt).toString('hex').slice(0, 16)}.png`;
    return Promise.resolve({ assetRef: key, model: this.model, durationMs: Date.now() - started });
  }
}
