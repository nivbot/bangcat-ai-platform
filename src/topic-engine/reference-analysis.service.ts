import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AiPrismaService } from '../infrastructure/database/ai-prisma.service.js';
import type { Prisma } from '../generated/ai-prisma/client.js';
import {
  parseReferenceAnalysis,
  REFERENCE_ANALYSIS_SCHEMA_VERSION,
  type ReferenceAnalysisV1,
} from '../domain/reference-analysis.js';
import { estimateTextCostCny, ModelProviderError, type TextModelProvider } from '../domain/model-provider.js';
import { TEXT_PROVIDER } from '../infrastructure/providers/providers.module.js';
import {
  buildReferenceAnalysisPrompt,
  REFERENCE_ANALYSIS_PROMPT_VERSION,
} from './reference-analysis.prompt.js';
import type { ActorContext } from './topic-engine.service.js';

function asJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}

export interface AnalysisRunResult {
  analysisId: string;
  status: 'succeeded' | 'failed';
}

@Injectable()
export class ReferenceAnalysisService {
  private readonly logger = new Logger(ReferenceAnalysisService.name);

  constructor(
    private readonly prisma: AiPrismaService,
    @Inject(TEXT_PROVIDER) private readonly textProvider: TextModelProvider,
  ) {}

  async requestAnalysis(actor: ActorContext, referenceContentId: string): Promise<{ id: string; status: string }> {
    const reference = await this.prisma.referenceContent.findFirst({
      where: { id: referenceContentId, tenantId: actor.tenantId },
    });
    if (!reference) throw new NotFoundException('reference_not_found');
    if (reference.status === 'rejected' || reference.status === 'archived') {
      throw new BadRequestException('reference_not_analyzable');
    }
    const record = await this.prisma.referenceAnalysis.create({
      data: {
        tenantId: actor.tenantId,
        referenceContentId,
        schemaVersion: REFERENCE_ANALYSIS_SCHEMA_VERSION,
        promptVersion: REFERENCE_ANALYSIS_PROMPT_VERSION,
        provider: this.textProvider.name,
        model: this.textProvider.model,
        status: 'queued',
        createdBy: actor.actorId,
        updatedBy: actor.actorId,
      },
    });
    await this.audit(actor, 'reference_analysis.requested', record.id, { referenceContentId });
    return { id: record.id, status: record.status };
  }

  /** Worker entry: run one queued analysis to completion. Idempotent per record. */
  async runAnalysis(analysisId: string): Promise<AnalysisRunResult> {
    const analysis = await this.prisma.referenceAnalysis.findUnique({
      where: { id: analysisId },
      include: { referenceContent: true },
    });
    if (!analysis) throw new NotFoundException('reference_analysis_not_found');
    if (analysis.status === 'succeeded' || analysis.status === 'approved') {
      return { analysisId, status: 'succeeded' }; // idempotent: already done
    }

    await this.prisma.referenceAnalysis.update({
      where: { id: analysisId },
      data: { status: 'running', startedAt: new Date() },
    });

    const { systemPrompt, userPrompt } = buildReferenceAnalysisPrompt({
      platform: analysis.referenceContent.platform,
      title: analysis.referenceContent.title,
      summary: analysis.referenceContent.summary,
      metrics: (analysis.referenceContent.metrics ?? {}) as Record<string, unknown>,
    });

    try {
      const result = await this.textProvider.generateText({ systemPrompt, userPrompt, maxTokens: 4096 });
      const { analysis: parsed, issues } = parseReferenceAnalysis(result.outputText);
      const cost = estimateTextCostCny(
        this.textProvider.name,
        result.model,
        result.promptTokens,
        result.completionTokens,
      );
      if (!parsed) {
        await this.prisma.referenceAnalysis.update({
          where: { id: analysisId },
          data: {
            status: 'failed',
            errorCode: 'invalid_output',
            errorMessage: issues.map((issue) => `${issue.field}: ${issue.message}`).join('; '),
            validationIssues: asJson(issues),
            finishedAt: new Date(),
            durationMs: result.durationMs,
            tokenUsage: asJson({ promptTokens: result.promptTokens, completionTokens: result.completionTokens }),
            estimatedCostCny: cost,
          },
        });
        return { analysisId, status: 'failed' };
      }
      await this.prisma.referenceAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'succeeded',
          analysis: asJson(parsed),
          validationIssues: asJson(issues),
          finishedAt: new Date(),
          durationMs: result.durationMs,
          tokenUsage: asJson({ promptTokens: result.promptTokens, completionTokens: result.completionTokens }),
          estimatedCostCny: cost,
        },
      });
      await this.prisma.referenceContent.update({
        where: { id: analysis.referenceContentId },
        data: { status: 'analyzed' },
      });
      return { analysisId, status: 'succeeded' };
    } catch (error) {
      const code = error instanceof ModelProviderError ? error.code : 'provider_error';
      this.logger.warn(`reference analysis ${analysisId} failed (${code}): ${String(error)}`);
      await this.prisma.referenceAnalysis.update({
        where: { id: analysisId },
        data: {
          status: 'failed',
          errorCode: code,
          errorMessage: error instanceof Error ? error.message : String(error),
          finishedAt: new Date(),
        },
      });
      return { analysisId, status: 'failed' };
    }
  }

  list(actor: ActorContext, referenceContentId?: string, status?: string) {
    return this.prisma.referenceAnalysis.findMany({
      where: {
        tenantId: actor.tenantId,
        ...(referenceContentId ? { referenceContentId } : {}),
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(actor: ActorContext, id: string) {
    const record = await this.prisma.referenceAnalysis.findFirst({
      where: { id, tenantId: actor.tenantId },
      include: { referenceContent: { select: { id: true, platform: true, title: true, url: true } } },
    });
    if (!record) throw new NotFoundException('reference_analysis_not_found');
    return record;
  }

  /** Human review: approve turns the abstract pattern into a ViralPattern. */
  async review(
    actor: ActorContext,
    id: string,
    decision: 'approved' | 'rejected',
    note?: string,
  ): Promise<Record<string, unknown>> {
    const record = await this.get(actor, id);
    if (record.status !== 'succeeded' && record.status !== 'approved' && record.status !== 'rejected') {
      throw new BadRequestException('analysis_not_reviewable');
    }
    const updated = await this.prisma.referenceAnalysis.update({
      where: { id },
      data: {
        status: decision,
        reviewedBy: actor.actorId,
        reviewedAt: new Date(),
        reviewNote: note ?? null,
        updatedBy: actor.actorId,
      },
    });
    await this.audit(actor, `reference_analysis.${decision}`, id, { note });

    let pattern: Record<string, unknown> | null = null;
    if (decision === 'approved') {
      pattern = await this.upsertPatternFromAnalysis(actor, id, record.analysis as unknown as ReferenceAnalysisV1);
    }
    return { analysis: updated, pattern };
  }

  /** Only the abstract pattern fields cross into downstream topic context. */
  private async upsertPatternFromAnalysis(
    actor: ActorContext,
    analysisId: string,
    analysis: ReferenceAnalysisV1 | null,
  ): Promise<Record<string, unknown>> {
    if (!analysis) throw new BadRequestException('analysis_has_no_output');
    const record = await this.prisma.referenceAnalysis.findUniqueOrThrow({ where: { id: analysisId } });
    const existing = await this.prisma.viralPattern.findFirst({
      where: { tenantId: actor.tenantId, name: `analysis:${analysisId}` },
      select: { id: true },
    });
    const data = {
      tenantId: actor.tenantId,
      name: `analysis:${analysisId}`,
      category: 'reference-analysis',
      hookPattern: analysis.titleFunction.join('；'),
      narrativeStructure: analysis.narrativeBeats,
      emotionCurve: analysis.emotionCurve,
      visualGrammar: analysis.visualGrammar,
      interactionMechanism: analysis.interactionMechanism,
      prohibitedElements: [
        ...analysis.prohibitedElements,
        ...analysis.sourceSpecificElements.map((element) => `不使用来源专有元素：${element}`),
      ],
      status: 'active',
      updatedBy: actor.actorId,
    };
    const pattern = existing
      ? await this.prisma.viralPattern.update({ where: { id: existing.id }, data })
      : await this.prisma.viralPattern.create({ data: { ...data, createdBy: actor.actorId } });
    await this.prisma.patternSourceLink.upsert({
      where: {
        tenantId_patternId_referenceContentId: {
          tenantId: actor.tenantId,
          patternId: pattern.id,
          referenceContentId: record.referenceContentId,
        },
      },
      update: {},
      create: {
        tenantId: actor.tenantId,
        patternId: pattern.id,
        referenceContentId: record.referenceContentId,
      },
    });
    await this.audit(actor, 'reference_analysis.pattern_materialized', pattern.id, { analysisId });
    return pattern as unknown as Record<string, unknown>;
  }

  private async audit(
    actor: ActorContext,
    action: string,
    entityId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: actor.tenantId,
        requestId: actor.requestId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        action,
        entityType: 'reference_analysis',
        entityId,
        metadata: JSON.parse(JSON.stringify(metadata ?? {})),
      },
    });
  }
}
