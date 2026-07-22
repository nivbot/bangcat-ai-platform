import { Body, Controller, Get, Headers, Param, Post, Put, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CatOpportunityDto,
  CreateCandidateFromCatDto,
  ReferenceContentDto,
  RequestReferenceAnalysisDto,
  ReviewReferenceAnalysisDto,
  ScoreTopicCandidateDto,
  TopicCandidateDto,
  TrendSignalDto,
  UpdateTopicStatusDto,
  ViralPatternDto,
} from './dto/topic-engine.dto.js';
import { TopicEngineService, type ActorContext } from './topic-engine.service.js';
import { ReferenceAnalysisService } from './reference-analysis.service.js';
import { JobDispatchService } from '../jobs/job-dispatch.service.js';

@Controller('topic')
export class TopicEngineController {
  constructor(
    private readonly service: TopicEngineService,
    private readonly analyses: ReferenceAnalysisService,
    private readonly jobs: JobDispatchService,
    private readonly config: ConfigService,
  ) {}

  private actor(headers: Record<string, string | undefined>): ActorContext {
    return {
      tenantId: headers['x-tenant-id'] || this.config.get<string>('app.defaultTenantId') || 'bangcat',
      actorId: headers['x-actor-id'] || null,
      actorType: headers['x-actor-type'] || 'internal_service',
      requestId: headers['x-request-id'] || null,
    };
  }

  @Get('trends')
  listTrends(@Headers() headers: Record<string, string>, @Query('status') status?: string) {
    return this.service.listTrends(this.actor(headers), status);
  }

  @Post('trends')
  createTrend(@Headers() headers: Record<string, string>, @Body() dto: TrendSignalDto) {
    return this.service.saveTrend(this.actor(headers), dto);
  }

  @Put('trends/:id')
  updateTrend(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: TrendSignalDto) {
    return this.service.saveTrend(this.actor(headers), dto, id);
  }

  @Get('references')
  listReferences(@Headers() headers: Record<string, string>, @Query('status') status?: string) {
    return this.service.listReferences(this.actor(headers), status);
  }

  @Post('references')
  createReference(@Headers() headers: Record<string, string>, @Body() dto: ReferenceContentDto) {
    return this.service.saveReference(this.actor(headers), dto);
  }

  @Put('references/:id')
  updateReference(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: ReferenceContentDto) {
    return this.service.saveReference(this.actor(headers), dto, id);
  }

  @Get('patterns')
  listPatterns(@Headers() headers: Record<string, string>, @Query('status') status?: string) {
    return this.service.listPatterns(this.actor(headers), status);
  }

  @Post('patterns')
  createPattern(@Headers() headers: Record<string, string>, @Body() dto: ViralPatternDto) {
    return this.service.savePattern(this.actor(headers), dto);
  }

  @Put('patterns/:id')
  updatePattern(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: ViralPatternDto) {
    return this.service.savePattern(this.actor(headers), dto, id);
  }

  @Get('opportunities')
  listOpportunities(
    @Headers() headers: Record<string, string>,
    @Query('catAssetId') catAssetId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listOpportunities(this.actor(headers), catAssetId, status);
  }

  @Post('opportunities')
  createOpportunity(@Headers() headers: Record<string, string>, @Body() dto: CatOpportunityDto) {
    return this.service.saveOpportunity(this.actor(headers), dto);
  }

  @Put('opportunities/:id')
  updateOpportunity(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: CatOpportunityDto) {
    return this.service.saveOpportunity(this.actor(headers), dto, id);
  }

  @Get('candidates')
  listCandidates(
    @Headers() headers: Record<string, string>,
    @Query('status') status?: string,
    @Query('catAssetId') catAssetId?: string,
  ) {
    return this.service.listCandidates(this.actor(headers), status, catAssetId);
  }

  @Get('candidates/:id')
  getCandidate(@Headers() headers: Record<string, string>, @Param('id') id: string) {
    return this.service.getCandidate(this.actor(headers), id);
  }

  @Post('candidates')
  createCandidate(@Headers() headers: Record<string, string>, @Body() dto: TopicCandidateDto) {
    return this.service.saveCandidate(this.actor(headers), dto);
  }

  @Put('candidates/:id')
  updateCandidate(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: TopicCandidateDto) {
    return this.service.saveCandidate(this.actor(headers), dto, id);
  }

  @Post('candidates/:id/score')
  scoreCandidate(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: ScoreTopicCandidateDto) {
    return this.service.scoreCandidate(this.actor(headers), id, dto);
  }

  @Post('candidates/:id/status')
  updateCandidateStatus(
    @Headers() headers: Record<string, string>,
    @Param('id') id: string,
    @Body() dto: UpdateTopicStatusDto,
  ) {
    return this.service.updateCandidateStatus(this.actor(headers), id, dto.status);
  }

  @Post('candidates/from-cat')
  createCandidateFromCat(@Headers() headers: Record<string, string>, @Body() dto: CreateCandidateFromCatDto) {
    return this.service.createCandidateFromCat(this.actor(headers), dto);
  }

  @Get('reference-analyses')
  listAnalyses(
    @Headers() headers: Record<string, string>,
    @Query('referenceContentId') referenceContentId?: string,
    @Query('status') status?: string,
  ) {
    return this.analyses.list(this.actor(headers), referenceContentId, status);
  }

  @Get('reference-analyses/:id')
  getAnalysis(@Headers() headers: Record<string, string>, @Param('id') id: string) {
    return this.analyses.get(this.actor(headers), id);
  }

  @Post('reference-analyses')
  async requestAnalysis(@Headers() headers: Record<string, string>, @Body() dto: RequestReferenceAnalysisDto) {
    const actor = this.actor(headers);
    const analysis = await this.analyses.requestAnalysis(actor, dto.referenceContentId);
    const job = await this.jobs.enqueueReferenceAnalysis({
      tenantId: actor.tenantId,
      analysisId: analysis.id,
      requestedBy: actor.actorId,
    });
    return { analysisId: analysis.id, status: 'queued', queueJobId: job.id };
  }

  @Post('reference-analyses/:id/review')
  reviewAnalysis(@Headers() headers: Record<string, string>, @Param('id') id: string, @Body() dto: ReviewReferenceAnalysisDto) {
    return this.analyses.review(this.actor(headers), id, dto.decision, dto.note);
  }
}
