import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/source-prisma/client.js';
import type { DatabaseConnectionOptions } from '../../config/configuration.js';

@Injectable()
export class SourcePrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SourcePrismaService.name);
  private readonly required: boolean;

  constructor(config: ConfigService) {
    const options = config.getOrThrow<DatabaseConnectionOptions>('database.source');
    const adapter = new PrismaMariaDb(options);
    super({ adapter });
    this.required = config.get<boolean>('database.sourceRequired') ?? false;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
    } catch (error) {
      if (this.required) throw error;
      this.logger.warn(`Source database is unavailable; read-only sync is disabled: ${String(error)}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
