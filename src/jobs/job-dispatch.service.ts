import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';
import type { TopicAnalysisJobData } from './topic-analysis.processor.js';

@Injectable()
export class JobDispatchService {
  constructor(@InjectQueue('topic-analysis') private readonly queue: Queue<TopicAnalysisJobData>) {}

  enqueueReferenceAnalysis(data: TopicAnalysisJobData) {
    return this.queue.add('reference-analysis', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }
}
