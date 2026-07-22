import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ImageModelProvider, TextModelProvider } from '../../domain/model-provider.js';
import { AnthropicTextProvider } from './anthropic.provider.js';
import { MockImageProvider, MockTextProvider } from './mock.providers.js';

export const TEXT_PROVIDER = 'TEXT_PROVIDER';
export const IMAGE_PROVIDER = 'IMAGE_PROVIDER';

@Global()
@Module({
  providers: [
    AnthropicTextProvider,
    MockTextProvider,
    MockImageProvider,
    {
      provide: TEXT_PROVIDER,
      inject: [ConfigService, AnthropicTextProvider, MockTextProvider],
      useFactory: (
        config: ConfigService,
        anthropic: AnthropicTextProvider,
        mock: MockTextProvider,
      ): TextModelProvider => (config.get<string>('providers.text') === 'anthropic' ? anthropic : mock),
    },
    {
      provide: IMAGE_PROVIDER,
      inject: [ConfigService, MockImageProvider],
      useFactory: (config: ConfigService, mock: MockImageProvider): ImageModelProvider => {
        // Only the explicitly-marked mock image provider exists in the MVP;
        // a real provider plugs in here behind IMAGE_PROVIDER=dashscope etc.
        const configured = config.get<string>('providers.image') ?? 'mock';
        if (configured !== 'mock') {
          throw new Error(`image provider "${configured}" is not implemented in the MVP`);
        }
        return mock;
      },
    },
  ],
  exports: [TEXT_PROVIDER, IMAGE_PROVIDER],
})
export class ProvidersModule {}
