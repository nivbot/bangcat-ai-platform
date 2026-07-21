import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/ai-prisma/client.js';
import type { DatabaseConnectionOptions } from '../../config/configuration.js';

@Injectable()
export class AiPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    const options = config.getOrThrow<DatabaseConnectionOptions>('database.ai');
    const adapter = new PrismaMariaDb(options);
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
