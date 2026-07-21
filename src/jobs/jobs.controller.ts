import { Body, Controller, Headers, Post } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { JobDispatchService } from './job-dispatch.service.js';

class ReferenceAnalysisJobDto {
  @IsString()
  referenceContentId!: string;
}

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobDispatchService,
    private readonly config: ConfigService,
  ) {}

  @Post('reference-analysis')
  async enqueue(
    @Headers() headers: Record<string, string>,
    @Body() dto: ReferenceAnalysisJobDto,
  ) {
    const job = await this.jobs.enqueueReferenceAnalysis({
      tenantId: headers['x-tenant-id'] || this.config.get<string>('app.defaultTenantId') || 'bangcat',
      referenceContentId: dto.referenceContentId,
      requestedBy: headers['x-actor-id'] || null,
    });
    return { jobId: job.id, queue: 'topic-analysis', status: 'queued' };
  }
}
