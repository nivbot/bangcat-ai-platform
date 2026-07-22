import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { DatabaseModule } from './infrastructure/database/database.module.js';
import { QueueInfrastructureModule } from './infrastructure/queue/queue.module.js';
import { StorageModule } from './infrastructure/storage/storage.module.js';
import { ProvidersModule } from './infrastructure/providers/providers.module.js';
import { JobsWorkerModule } from './jobs/jobs-worker.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    QueueInfrastructureModule,
    StorageModule,
    ProvidersModule,
    JobsWorkerModule,
  ],
})
export class WorkerModule {}
