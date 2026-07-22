import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SourceCatsService, SourceCatNotFoundError, SourceUnavailableError } from './source-cats.service.js';
import { CatAssetsService } from './cat-assets.service.js';
import type { ActorContext } from '../topic-engine/topic-engine.service.js';

class ListSourceCatsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) pageSize?: number;
  @IsOptional() @IsString() adoptionStatus?: string;
  @IsOptional() @IsString() keyword?: string;
}

@Controller('cats')
export class CatsController {
  constructor(
    private readonly sourceCats: SourceCatsService,
    private readonly catAssets: CatAssetsService,
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

  private rethrowSourceError(error: unknown): never {
    if (error instanceof SourceCatNotFoundError) throw new NotFoundException('source_cat_not_found');
    if (error instanceof SourceUnavailableError) throw new ServiceUnavailableException('source_unavailable');
    throw new InternalServerErrorException('internal_error');
  }

  /** List eligible public cats straight from the SELECT-only source connection. */
  @Get('source')
  listSourceCats(@Headers() headers: Record<string, string>, @Query() query: ListSourceCatsQuery) {
    return this.sourceCats
      .listCats(query)
      .catch((error: unknown) => this.rethrowSourceError(error));
  }

  /** Sanitized public profile of one source cat; nothing is persisted. */
  @Get('source/:sourceId')
  async getSourceCat(@Headers() headers: Record<string, string>, @Param('sourceId') sourceId: string) {
    try {
      const detail = await this.sourceCats.getCat(sourceId);
      const sanitized = this.catAssets.sanitize(detail.untrusted);
      return {
        cat: sanitized.asset,
        sanitizationIssues: sanitized.issues,
        excludedSourceFields: sanitized.excludedSourceFields,
      };
    } catch (error) {
      this.rethrowSourceError(error);
    }
  }

  /** Import (or refresh) one source cat into the AI asset tables. */
  @Post('source/:sourceId/import')
  async importSourceCat(@Headers() headers: Record<string, string>, @Param('sourceId') sourceId: string) {
    const actor = this.actor(headers);
    try {
      const detail = await this.sourceCats.getCat(sourceId);
      const sanitized = this.catAssets.sanitize(detail.untrusted);
      if (!sanitized.asset.isPublic) throw new BadRequestException('cat_not_public');
      const result = await this.catAssets.upsertFromSource(actor, sanitized);
      return {
        catAssetId: result.id,
        created: result.created,
        cat: sanitized.asset,
        sanitizationIssues: sanitized.issues,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.rethrowSourceError(error);
    }
  }

  @Get()
  listCatAssets(@Headers() headers: Record<string, string>, @Query('adoptionStatus') adoptionStatus?: string) {
    return this.catAssets.listAssets(this.actor(headers), adoptionStatus);
  }

  @Get(':id')
  async getCatAsset(@Headers() headers: Record<string, string>, @Param('id') id: string) {
    const cat = await this.catAssets.getAsset(this.actor(headers), id);
    if (!cat) throw new NotFoundException('cat_asset_not_found');
    return cat;
  }
}
