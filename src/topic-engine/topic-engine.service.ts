import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { AiPrismaService } from '../infrastructure/database/ai-prisma.service.js';
import type { Prisma } from '../generated/ai-prisma/client.js';
import {
  scoreTopicCandidate,
  validateTopicCandidate,
  type TopicSignals,
} from '../domain/topic-engine.js';
import type {
  CatOpportunityDto,
  ReferenceContentDto,
  ScoreTopicCandidateDto,
  TopicCandidateDto,
  TrendSignalDto,
  ViralPatternDto,
} from './dto/topic-engine.dto.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export interface ActorContext {
  tenantId: string;
  actorId: string | null;
  actorType: string;
  requestId: string | null;
}

@Injectable()
export class TopicEngineService {
  constructor(private readonly prisma: AiPrismaService) {}

  private async audit(
    actor: ActorContext,
    action: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        requestId: actor.requestId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action,
        entityType,
        entityId,
        metadata: asJson(metadata),
      },
    });
  }

  listTrends(actor: ActorContext, status?: string) {
    return this.prisma.trendSignal.findMany({
      where: { tenantId: actor.tenantId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async saveTrend(actor: ActorContext, dto: TrendSignalDto, id?: string) {
    if (id && !(await this.prisma.trendSignal.findFirst({ where: { id, tenantId: actor.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('trend_not_found');
    }
    const data = {
      tenantId: actor.tenantId,
      signalType: dto.signalType,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      platform: dto.platform?.trim() || null,
      signalStrength: dto.signalStrength,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      sourceUrl: dto.sourceUrl || null,
      metadata: asJson(dto.metadata ?? {}),
      status: dto.status ?? 'active',
      updatedBy: actor.actorId,
    };
    const record = id
      ? await this.prisma.trendSignal.update({ where: { id }, data })
      : await this.prisma.trendSignal.create({ data: { ...data, createdBy: actor.actorId } });
    await this.audit(actor, id ? 'topic.trend.updated' : 'topic.trend.created', 'trend_signal', record.id);
    return record;
  }

  listReferences(actor: ActorContext, status?: string) {
    return this.prisma.referenceContent.findMany({
      where: { tenantId: actor.tenantId, ...(status ? { status } : {}) },
      orderBy: { capturedAt: 'desc' },
    });
  }

  async saveReference(actor: ActorContext, dto: ReferenceContentDto, id?: string) {
    if (id && !(await this.prisma.referenceContent.findFirst({ where: { id, tenantId: actor.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('reference_not_found');
    }
    const urlHash = createHash('sha256').update(dto.url.trim()).digest('hex');
    const data = {
      tenantId: actor.tenantId,
      platform: dto.platform.trim(),
      url: dto.url.trim(),
      urlHash,
      title: dto.title?.trim() || null,
      summary: dto.summary.trim(),
      metrics: asJson(dto.metrics ?? {}),
      publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : null,
      capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : new Date(),
      status: dto.status ?? 'pending',
      updatedBy: actor.actorId,
    };
    const record = id
      ? await this.prisma.referenceContent.update({ where: { id }, data })
      : await this.prisma.referenceContent.create({ data: { ...data, createdBy: actor.actorId } });
    await this.audit(actor, id ? 'topic.reference.updated' : 'topic.reference.created', 'reference_content', record.id);
    return record;
  }

  listPatterns(actor: ActorContext, status?: string) {
    return this.prisma.viralPattern.findMany({
      where: { tenantId: actor.tenantId, ...(status ? { status } : {}) },
      include: { sourceLinks: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async savePattern(actor: ActorContext, dto: ViralPatternDto, id?: string) {
    if (id && !(await this.prisma.viralPattern.findFirst({ where: { id, tenantId: actor.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('pattern_not_found');
    }
    const referenceIds = [...new Set(dto.referenceContentIds ?? [])];
    if (referenceIds.length > 0) {
      const count = await this.prisma.referenceContent.count({
        where: { tenantId: actor.tenantId, id: { in: referenceIds } },
      });
      if (count !== referenceIds.length) throw new BadRequestException('reference_not_found');
    }
    const data = {
      tenantId: actor.tenantId,
      name: dto.name.trim(),
      category: dto.category.trim(),
      hookPattern: dto.hookPattern.trim(),
      narrativeStructure: dto.narrativeStructure,
      emotionCurve: dto.emotionCurve,
      visualGrammar: dto.visualGrammar,
      interactionMechanism: dto.interactionMechanism?.trim() || null,
      prohibitedElements: dto.prohibitedElements,
      status: dto.status ?? 'draft',
      updatedBy: actor.actorId,
    };
    const record = await this.prisma.$transaction(async (tx: any) => {
      const pattern = id
        ? await tx.viralPattern.update({ where: { id }, data })
        : await tx.viralPattern.create({ data: { ...data, createdBy: actor.actorId } });
      await tx.patternSourceLink.deleteMany({
        where: { tenantId: actor.tenantId, patternId: pattern.id },
      });
      if (referenceIds.length > 0) {
        await tx.patternSourceLink.createMany({
          data: referenceIds.map((referenceContentId) => ({
            tenantId: actor.tenantId,
            patternId: pattern.id,
            referenceContentId,
          })),
        });
      }
      return pattern;
    });
    await this.audit(actor, id ? 'topic.pattern.updated' : 'topic.pattern.created', 'viral_pattern', record.id);
    return this.prisma.viralPattern.findUnique({ where: { id: record.id }, include: { sourceLinks: true } });
  }

  listOpportunities(actor: ActorContext, catAssetId?: string, status?: string) {
    return this.prisma.catContentOpportunity.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(catAssetId ? { catAssetId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async saveOpportunity(actor: ActorContext, dto: CatOpportunityDto, id?: string) {
    if (id && !(await this.prisma.catContentOpportunity.findFirst({ where: { id, tenantId: actor.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('opportunity_not_found');
    }
    const cat = await this.prisma.catAsset.findFirst({
      where: { id: dto.catAssetId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!cat) throw new BadRequestException('cat_not_found');
    const data = {
      tenantId: actor.tenantId,
      catAssetId: dto.catAssetId,
      opportunityType: dto.opportunityType,
      summary: dto.summary.trim(),
      uniqueFacts: dto.uniqueFacts,
      availableAssets: dto.availableAssets,
      businessGoals: dto.businessGoals,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      status: dto.status ?? 'active',
      updatedBy: actor.actorId,
    };
    const record = id
      ? await this.prisma.catContentOpportunity.update({ where: { id }, data })
      : await this.prisma.catContentOpportunity.create({ data: { ...data, createdBy: actor.actorId } });
    await this.audit(actor, id ? 'topic.opportunity.updated' : 'topic.opportunity.created', 'cat_content_opportunity', record.id);
    return record;
  }

  listCandidates(actor: ActorContext, status?: string, catAssetId?: string) {
    return this.prisma.topicCandidate.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(status ? { status } : {}),
        ...(catAssetId ? { catAssetId } : {}),
      },
      include: { trendLinks: true, patternLinks: true },
      orderBy: [{ totalScore: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async saveCandidate(actor: ActorContext, dto: TopicCandidateDto, id?: string) {
    if (id && !(await this.prisma.topicCandidate.findFirst({ where: { id, tenantId: actor.tenantId }, select: { id: true } }))) {
      throw new NotFoundException('candidate_not_found');
    }
    const cat = await this.prisma.catAsset.findFirst({
      where: { id: dto.catAssetId, tenantId: actor.tenantId },
      select: { id: true },
    });
    if (!cat) throw new BadRequestException('cat_not_found');

    const patternIds = [...new Set(dto.patternIds)];
    const trendIds = [...new Set(dto.trendSignalIds)];
    const [patternCount, trendCount] = await Promise.all([
      this.prisma.viralPattern.count({ where: { tenantId: actor.tenantId, id: { in: patternIds } } }),
      this.prisma.trendSignal.count({ where: { tenantId: actor.tenantId, id: { in: trendIds } } }),
    ]);
    if (patternCount !== patternIds.length) throw new BadRequestException('pattern_not_found');
    if (trendCount !== trendIds.length) throw new BadRequestException('trend_not_found');

    const candidateId = id ?? randomUUID();
    const issues = validateTopicCandidate({
      id: candidateId,
      catId: dto.catAssetId,
      platform: dto.platform,
      format: dto.format,
      contentLevel: dto.contentLevel,
      premise: dto.premise,
      audienceReason: dto.audienceReason,
      hook: dto.hook,
      storyBeats: dto.storyBeats,
      patternIds,
      factSourceIds: dto.factSourceIds,
      assetRequirements: dto.assetRequirements,
      originalityConstraints: dto.originalityConstraints,
    });
    if (issues.length > 0) throw new BadRequestException({ error: 'invalid_topic_candidate', issues });

    const record = await this.prisma.$transaction(async (tx: any) => {
      const data = {
        tenantId: actor.tenantId,
        catAssetId: dto.catAssetId,
        platform: dto.platform,
        format: dto.format,
        contentLevel: dto.contentLevel,
        premise: dto.premise.trim(),
        audienceReason: dto.audienceReason.trim(),
        hook: dto.hook.trim(),
        storyBeats: dto.storyBeats,
        factSourceIds: dto.factSourceIds,
        assetRequirements: dto.assetRequirements,
        originalityConstraints: dto.originalityConstraints,
        signals: null,
        score: null,
        totalScore: null,
        scoreDecision: null,
        scoreVersion: null,
        status: 'draft',
        updatedBy: actor.actorId,
      };
      const candidate = id
        ? await tx.topicCandidate.update({ where: { id }, data })
        : await tx.topicCandidate.create({ data: { id: candidateId, ...data, createdBy: actor.actorId } });
      await tx.topicCandidatePattern.deleteMany({ where: { tenantId: actor.tenantId, topicCandidateId: candidate.id } });
      await tx.topicCandidateTrend.deleteMany({ where: { tenantId: actor.tenantId, topicCandidateId: candidate.id } });
      await tx.topicCandidatePattern.createMany({
        data: patternIds.map((viralPatternId) => ({
          tenantId: actor.tenantId,
          topicCandidateId: candidate.id,
          viralPatternId,
        })),
      });
      if (trendIds.length > 0) {
        await tx.topicCandidateTrend.createMany({
          data: trendIds.map((trendSignalId) => ({
            tenantId: actor.tenantId,
            topicCandidateId: candidate.id,
            trendSignalId,
          })),
        });
      }
      return candidate;
    });
    await this.audit(actor, id ? 'topic.candidate.updated' : 'topic.candidate.created', 'topic_candidate', record.id);
    return this.getCandidate(actor, record.id);
  }

  async getCandidate(actor: ActorContext, id: string) {
    const candidate = await this.prisma.topicCandidate.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { trendLinks: true, patternLinks: true, scoreRuns: { orderBy: { createdAt: 'desc' } } },
    });
    if (!candidate) throw new NotFoundException('candidate_not_found');
    return candidate;
  }

  async scoreCandidate(actor: ActorContext, id: string, dto: ScoreTopicCandidateDto) {
    await this.getCandidate(actor, id);
    const result = scoreTopicCandidate(dto.signals as TopicSignals);
    const scoringVersion = dto.scoringVersion ?? 'topic-score-v1';
    await this.prisma.$transaction(async (tx: any) => {
      await tx.topicCandidate.update({
        where: { id },
        data: {
          signals: dto.signals,
          score: result,
          totalScore: result.totalScore,
          scoreDecision: result.decision,
          scoreVersion: scoringVersion,
          status: result.decision,
          updatedBy: actor.actorId,
        },
      });
      await tx.topicScoreRun.create({
        data: {
          tenantId: actor.tenantId,
          topicCandidateId: id,
          signals: dto.signals,
          result,
          scoringVersion,
          createdBy: actor.actorId,
        },
      });
    });
    await this.audit(actor, 'topic.candidate.scored', 'topic_candidate', id, {
      decision: result.decision,
      totalScore: result.totalScore,
      scoringVersion,
    });
    return this.getCandidate(actor, id);
  }

  async updateCandidateStatus(actor: ActorContext, id: string, status: string) {
    const candidate = await this.getCandidate(actor, id);
    if (['recommended', 'review', 'rejected', 'blocked', 'selected'].includes(status) && !candidate.score) {
      throw new BadRequestException('candidate_must_be_scored');
    }
    const updated = await this.prisma.topicCandidate.update({
      where: { id },
      data: { status, updatedBy: actor.actorId },
    });
    await this.audit(actor, 'topic.candidate.status_changed', 'topic_candidate', id, { status });
    return updated;
  }
}
