import { Module } from '@nestjs/common';
import { TopicEngineController } from './topic-engine.controller.js';
import { TopicEngineService } from './topic-engine.service.js';

@Module({
  controllers: [TopicEngineController],
  providers: [TopicEngineService],
  exports: [TopicEngineService],
})
export class TopicEngineModule {}
