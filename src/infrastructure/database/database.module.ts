import { Global, Module } from '@nestjs/common';
import { AiPrismaService } from './ai-prisma.service.js';
import { SourcePrismaService } from './source-prisma.service.js';

@Global()
@Module({
  providers: [AiPrismaService, SourcePrismaService],
  exports: [AiPrismaService, SourcePrismaService],
})
export class DatabaseModule {}
