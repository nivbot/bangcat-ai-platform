import { Module } from '@nestjs/common';
import { JobDispatchService } from './job-dispatch.service.js';
import { JobsController } from './jobs.controller.js';
import { TopicAnalysisProcessor } from './topic-analysis.processor.js';

@Module({
  controllers: [JobsController],
  providers: [JobDispatchService, TopicAnalysisProcessor],
  exports: [JobDispatchService],
})
export class JobsModule {}
