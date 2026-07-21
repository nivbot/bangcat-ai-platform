import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

export interface TopicAnalysisJobData {
  tenantId: string;
  referenceContentId: string;
  requestedBy: string | null;
}

@Processor('topic-analysis')
export class TopicAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(TopicAnalysisProcessor.name);

  async process(job: Job<TopicAnalysisJobData>): Promise<Record<string, unknown>> {
    this.logger.log(`Received topic-analysis job ${job.id} for reference ${job.data.referenceContentId}`);
    return {
      status: 'queued_for_phase_t1_implementation',
      referenceContentId: job.data.referenceContentId,
    };
  }
}
