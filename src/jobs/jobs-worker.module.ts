import { Module } from '@nestjs/common';
import { TopicAnalysisProcessor } from './topic-analysis.processor.js';
import { TopicEngineModule } from '../topic-engine/topic-engine.module.js';

@Module({
  imports: [TopicEngineModule],
  providers: [TopicAnalysisProcessor],
})
export class JobsWorkerModule {}
