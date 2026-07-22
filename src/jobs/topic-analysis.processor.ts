import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { ReferenceAnalysisService } from '../topic-engine/reference-analysis.service.js';

export interface TopicAnalysisJobData {
  tenantId: string;
  referenceContentId?: string;
  analysisId?: string;
  requestedBy: string | null;
}

@Processor('topic-analysis')
export class TopicAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(TopicAnalysisProcessor.name);

  constructor(private readonly analyses: ReferenceAnalysisService) {
    super();
  }

  async process(job: Job<TopicAnalysisJobData>): Promise<Record<string, unknown>> {
    const analysisId = job.data.analysisId;
    if (!analysisId) {
      this.logger.warn(`topic-analysis job ${job.id} has no analysisId; skipping`);
      return { status: 'skipped', reason: 'missing_analysis_id' };
    }
    this.logger.log(`Running reference analysis ${analysisId} (job ${job.id}, attempt ${job.attemptsMade + 1})`);
    const result = await this.analyses.runAnalysis(analysisId);
    if (result.status === 'failed') {
      // Throwing lets BullMQ apply the configured retry/backoff policy.
      throw new Error(`reference_analysis_failed:${analysisId}`);
    }
    return { status: 'succeeded', analysisId };
  }
}
