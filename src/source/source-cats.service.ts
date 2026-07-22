import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../generated/source-prisma/client.js';
import { SourcePrismaService } from '../infrastructure/database/source-prisma.service.js';
import type { UntrustedSourceCat } from '../domain/cat-asset.js';
import type { SourceCatDetail, SourceCatSummary } from './source-cats.types.js';

const LIST_PAGE_MAX = 50;

@Injectable()
export class SourceCatsService {
  private readonly logger = new Logger(SourceCatsService.name);

  constructor(
    private readonly prisma: SourcePrismaService,
    private readonly config: ConfigService,
  ) {}

  private assertConfigured(): void {
    const { database } = this.config.getOrThrow<{ database: string }>('database.source');
    if (!database) {
      throw new SourceUnavailableError('source database is not configured');
    }
  }

  private toUntrusted(row: {
    sourceId: string;
    name: string;
    sex: string | null;
    age: string | null;
    adoptionStatus: string;
    publicDescription: string | null;
    publicRescueStory: string | null;
    publicPersonalityNotes: string | null;
    sourceUpdatedAt: Date;
    media: Prisma.JsonValue | null;
  }): UntrustedSourceCat {
    return {
      id: row.sourceId,
      name: row.name,
      sex: row.sex,
      approximateAgeMonths: row.age,
      breed: null,
      coatColor: null,
      adoptionStatus: row.adoptionStatus,
      description: row.publicDescription,
      rescueStory: row.publicRescueStory,
      personalityNotes: row.publicPersonalityNotes,
      updatedAt: row.sourceUpdatedAt.toISOString(),
      isPublic: true,
      media: row.media,
    };
  }

  async listCats(options: {
    page?: number;
    pageSize?: number;
    adoptionStatus?: string;
    keyword?: string;
  }): Promise<{ items: SourceCatSummary[]; page: number; pageSize: number; total: number; source: 'live' }> {
    this.assertConfigured();
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.min(LIST_PAGE_MAX, Math.max(1, options.pageSize ?? 20));
    const where: Prisma.AiPublicCatWhereInput = {
      ...(options.adoptionStatus ? { adoptionStatus: options.adoptionStatus } : {}),
      ...(options.keyword ? { name: { contains: options.keyword } } : {}),
    };
    try {
      const [total, rows] = await Promise.all([
        this.prisma.aiPublicCat.count({ where }),
        this.prisma.aiPublicCat.findMany({
          where,
          orderBy: { sourceUpdatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);
      return {
        items: rows.map((row) => ({
          sourceId: row.sourceId,
          name: row.name,
          sex: row.sex,
          adoptionStatus: row.adoptionStatus,
          image: row.image,
          stationId: row.stationId,
          sourceUpdatedAt: row.sourceUpdatedAt.toISOString(),
        })),
        page,
        pageSize,
        total,
        source: 'live',
      };
    } catch (error) {
      this.logger.warn(`source list query failed: ${String(error)}`);
      throw new SourceUnavailableError('source database query failed');
    }
  }

  async getCat(sourceId: string): Promise<SourceCatDetail> {
    this.assertConfigured();
    let row;
    try {
      row = await this.prisma.aiPublicCat.findUnique({ where: { sourceId } });
    } catch (error) {
      this.logger.warn(`source detail query failed: ${String(error)}`);
      throw new SourceUnavailableError('source database query failed');
    }
    if (!row) throw new SourceCatNotFoundError(sourceId);
    return { untrusted: this.toUntrusted(row), sourceUpdatedAt: row.sourceUpdatedAt };
  }
}

export class SourceUnavailableError extends Error {
  readonly code = 'source_unavailable';
}

export class SourceCatNotFoundError extends Error {
  readonly code = 'source_cat_not_found';
}
