import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AiPrismaService } from '../infrastructure/database/ai-prisma.service.js';
import { sanitizeSourceCat } from '../domain/sanitize-source-cat.js';
import { sha256Of } from '../domain/hash.js';
import type { SanitizationResult } from '../domain/cat-asset.js';
import type { ActorContext } from '../topic-engine/topic-engine.service.js';

@Injectable()
export class CatAssetsService {
  private readonly logger = new Logger(CatAssetsService.name);

  constructor(private readonly prisma: AiPrismaService) {}

  /**
   * Persist one sanitized source cat into catnote_ai_* (cat_assets +
   * cat_media_assets). Only allowlisted, redacted fields leave this method;
   * privacy fields never enter the AI database.
   */
  async upsertFromSource(
    actor: ActorContext,
    sanitized: SanitizationResult,
  ): Promise<{ id: string; created: boolean }> {
    const { asset } = sanitized;
    const sourceHash = createHash('sha256').update(sha256Of(asset)).digest('hex');
    const existing = await this.prisma.catAsset.findUnique({
      where: { tenantId_sourceId: { tenantId: actor.tenantId, sourceId: asset.sourceId } },
      select: { id: true },
    });

    const data = {
      tenantId: actor.tenantId,
      sourceId: asset.sourceId,
      name: asset.name,
      sex: asset.sex,
      approximateAgeMonths: asset.approximateAgeMonths,
      breed: asset.breed,
      coatColor: asset.coatColor,
      adoptionStatus: asset.adoptionStatus,
      publicDescription: asset.publicDescription,
      publicRescueStory: asset.publicRescueStory,
      publicPersonalityNotes: asset.publicPersonalityNotes,
      sourceUpdatedAt: new Date(asset.sourceUpdatedAt),
      sourceHash,
      isPublic: asset.isPublic,
      completenessScore: asset.completenessScore,
    };

    const cat = existing
      ? await this.prisma.catAsset.update({ where: { id: existing.id }, data })
      : await this.prisma.catAsset.create({ data });

    await this.prisma.catMediaAsset.deleteMany({
      where: { tenantId: actor.tenantId, catAssetId: cat.id },
    });
    if (asset.media.length > 0) {
      await this.prisma.catMediaAsset.createMany({
        data: asset.media.map((media) => ({
          tenantId: actor.tenantId,
          catAssetId: cat.id,
          sourceMediaId: media.sourceMediaId,
          sourceUrl: media.url,
          kind: media.kind,
          usageScope: media.usageScope,
          altText: media.altText,
        })),
      });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        requestId: actor.requestId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action: existing ? 'cats.asset.refreshed' : 'cats.asset.imported',
        entityType: 'cat_asset',
        entityId: cat.id,
        metadata: {
          sourceId: asset.sourceId,
          sanitizationIssues: sanitized.issues.length,
          excludedSourceFields: sanitized.excludedSourceFields,
        },
      },
    });

    return { id: cat.id, created: !existing };
  }

  listAssets(actor: ActorContext, status?: string) {
    return this.prisma.catAsset.findMany({
      where: {
        tenantId: actor.tenantId,
        isPublic: true,
        ...(status ? { adoptionStatus: status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: { media: true },
    });
  }

  async getAsset(actor: ActorContext, id: string) {
    const cat = await this.prisma.catAsset.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { media: true },
    });
    if (!cat) return null;
    return cat;
  }

  sanitize(untrusted: Parameters<typeof sanitizeSourceCat>[0]): SanitizationResult {
    return sanitizeSourceCat(untrusted);
  }
}
