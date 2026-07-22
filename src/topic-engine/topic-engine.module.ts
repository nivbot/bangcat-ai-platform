import { Module } from '@nestjs/common';
import { TopicEngineController } from './topic-engine.controller.js';
import { TopicEngineService } from './topic-engine.service.js';
import { ReferenceAnalysisService } from './reference-analysis.service.js';
import { JobsModule } from '../jobs/jobs.module.js';

@Module({
  imports: [JobsModule],
  controllers: [TopicEngineController],
  providers: [TopicEngineService, ReferenceAnalysisService],
  exports: [TopicEngineService, ReferenceAnalysisService],
})
export class TopicEngineModule {}
