import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator.js';
import { AiPrismaService } from '../infrastructure/database/ai-prisma.service.js';
import { SourcePrismaService } from '../infrastructure/database/source-prisma.service.js';

@Controller('health')
export class HealthController {
  constructor(
    private readonly aiPrisma: AiPrismaService,
    private readonly sourcePrisma: SourcePrismaService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Get()
  async health() {
    let aiDatabase = false;
    let sourceDatabase = false;
    try {
      await this.aiPrisma.$queryRaw`SELECT 1`;
      aiDatabase = true;
    } catch {
      aiDatabase = false;
    }
    try {
      await this.sourcePrisma.$queryRaw`SELECT 1`;
      sourceDatabase = true;
    } catch {
      sourceDatabase = false;
    }
    return {
      status: aiDatabase ? 'ok' : 'degraded',
      service: 'bangcat-ai-platform',
      version: '0.2.0',
      nodeEnv: this.config.get<string>('app.nodeEnv'),
      dependencies: { aiDatabase, sourceDatabase },
      timestamp: new Date().toISOString(),
    };
  }
}
