import { Module } from '@nestjs/common';
import { JobDispatchService } from './job-dispatch.service.js';
import { JobsController } from './jobs.controller.js';

@Module({
  controllers: [JobsController],
  providers: [JobDispatchService],
  exports: [JobDispatchService],
})
export class JobsModule {}
