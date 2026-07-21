import { Module } from '@nestjs/common';
import { TopicAnalysisProcessor } from './topic-analysis.processor.js';

@Module({
  providers: [TopicAnalysisProcessor],
})
export class JobsWorkerModule {}
