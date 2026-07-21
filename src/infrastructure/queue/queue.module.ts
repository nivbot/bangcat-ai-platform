import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

function redisConnection(urlText: string) {
  const url = new URL(urlText);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: Number(url.pathname.replace('/', '') || 0),
    maxRetriesPerRequest: null,
  };
}

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnection(config.get<string>('redis.url') ?? 'redis://127.0.0.1:6379/0'),
      }),
    }),
    BullModule.registerQueue({ name: 'topic-analysis' }),
  ],
  exports: [BullModule],
})
export class QueueInfrastructureModule {}
