import { Module } from '@nestjs/common';
import { CatsController } from './cats.controller.js';
import { CatAssetsService } from './cat-assets.service.js';
import { SourceCatsService } from './source-cats.service.js';

@Module({
  controllers: [CatsController],
  providers: [SourceCatsService, CatAssetsService],
  exports: [CatAssetsService],
})
export class CatsModule {}
