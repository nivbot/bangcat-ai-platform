import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration.js';
import { InternalServiceGuard } from './common/guards/internal-service.guard.js';
import { HealthController } from './health/health.controller.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { QueueInfrastructureModule } from './infrastructure/queue/queue.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { TopicEngineModule } from './topic-engine/topic-engine.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { CatsModule } from './source/cats.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    QueueInfrastructureModule,
    StorageModule,
    TopicEngineModule,
    JobsModule,
    CatsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: InternalServiceGuard }],
})
export class AppModule {}
