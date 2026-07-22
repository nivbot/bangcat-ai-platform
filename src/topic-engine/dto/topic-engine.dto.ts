import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TrendSignalDto {
  @IsIn(['platform_trend', 'seasonal', 'weather', 'social_mood', 'internal_event', 'business_goal'])
  signalType!: string;
  @IsString() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() platform?: string;
  @IsNumber() @Min(0) @Max(1) signalStrength!: number;
  @IsOptional() @IsDateString() startsAt?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsOptional() @IsUrl({ require_protocol: true }) sourceUrl?: string;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  @IsOptional() @IsIn(['active', 'inactive', 'archived']) status?: string;
}

export class ReferenceContentDto {
  @IsString() platform!: string;
  @IsUrl({ require_protocol: true }) url!: string;
  @IsOptional() @IsString() title?: string;
  @IsString() summary!: string;
  @IsOptional() @IsObject() metrics?: Record<string, unknown>;
  @IsOptional() @IsDateString() publishedAt?: string;
  @IsOptional() @IsDateString() capturedAt?: string;
  @IsOptional() @IsIn(['pending', 'analyzed', 'approved', 'rejected', 'archived']) status?: string;
}

export class ViralPatternDto {
  @IsString() name!: string;
  @IsString() category!: string;
  @IsString() hookPattern!: string;
  @IsArray() @ArrayMinSize(1) narrativeStructure!: string[];
  @IsArray() emotionCurve!: string[];
  @IsArray() visualGrammar!: string[];
  @IsOptional() @IsString() interactionMechanism?: string;
  @IsArray() prohibitedElements!: string[];
  @IsOptional() @IsArray() referenceContentIds?: string[];
  @IsOptional() @IsIn(['draft', 'active', 'archived']) status?: string;
}

export class CatOpportunityDto {
  @IsString() catAssetId!: string;
  @IsIn(['unique_fact', 'new_event', 'visual_trait', 'personality', 'adoption_need', 'series_role', 'business_goal'])
  opportunityType!: string;
  @IsString() summary!: string;
  @IsArray() @ArrayMinSize(1) uniqueFacts!: string[];
  @IsArray() @ArrayMinSize(1) availableAssets!: string[];
  @IsArray() businessGoals!: string[];
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsIn(['active', 'used', 'expired', 'archived']) status?: string;
}

export class TopicCandidateDto {
  @IsString() catAssetId!: string;
  @IsIn(['xiaohongshu', 'douyin', 'wechat_official', 'wechat_channels', 'bilibili'])
  platform!: 'xiaohongshu' | 'douyin' | 'wechat_official' | 'wechat_channels' | 'bilibili';
  @IsIn(['carousel', 'article', 'short_video', 'long_video'])
  format!: 'carousel' | 'article' | 'short_video' | 'long_video';
  @IsIn(['factual', 'adapted', 'fictional'])
  contentLevel!: 'factual' | 'adapted' | 'fictional';
  @IsString() premise!: string;
  @IsString() audienceReason!: string;
  @IsString() hook!: string;
  @IsArray() @ArrayMinSize(3) storyBeats!: string[];
  @IsArray() trendSignalIds!: string[];
  @IsArray() @ArrayMinSize(1) patternIds!: string[];
  @IsArray() @ArrayMinSize(1) factSourceIds!: string[];
  @IsArray() @ArrayMinSize(1) assetRequirements!: string[];
  @IsArray() @ArrayMinSize(1) originalityConstraints!: string[];
}

export class TopicSignalsDto {
  @IsNumber() @Min(0) @Max(1) trendRelevance!: number;
  @IsNumber() @Min(0) @Max(1) catFit!: number;
  @IsNumber() @Min(0) @Max(1) humanInterest!: number;
  @IsNumber() @Min(0) @Max(1) novelty!: number;
  @IsNumber() @Min(0) @Max(1) platformFit!: number;
  @IsNumber() @Min(0) @Max(1) assetFeasibility!: number;
  @IsNumber() @Min(0) @Max(1) adoptionOrBrandValue!: number;
  @IsNumber() @Min(0) @Max(1) timeliness!: number;
  @IsNumber() @Min(0) @Max(1) sourceSimilarityRisk!: number;
  @IsNumber() @Min(0) @Max(1) copyrightRisk!: number;
  @IsNumber() @Min(0) @Max(1) factualRisk!: number;
  @IsNumber() @Min(0) @Max(1) audienceFatigueRisk!: number;
}

export class ScoreTopicCandidateDto {
  @IsObject()
  @ValidateNested()
  @Type(() => TopicSignalsDto)
  signals!: TopicSignalsDto;

  @IsOptional() @IsString() scoringVersion?: string;
}

export class UpdateTopicStatusDto {
  @IsIn(['draft', 'recommended', 'review', 'rejected', 'blocked', 'selected', 'archived'])
  status!: string;
}

export class RequestReferenceAnalysisDto {
  @IsString() referenceContentId!: string;
}

export class ReviewReferenceAnalysisDto {
  @IsIn(['approved', 'rejected']) decision!: 'approved' | 'rejected';
  @IsOptional() @IsString() note?: string;
}

export class CreateCandidateFromCatDto {
  @IsString() catAssetId!: string;
  @IsIn(['xiaohongshu', 'douyin', 'wechat_official', 'wechat_channels', 'bilibili'])
  platform!: 'xiaohongshu' | 'douyin' | 'wechat_official' | 'wechat_channels' | 'bilibili';
  @IsIn(['carousel', 'article']) format!: 'carousel' | 'article';
  @IsIn(['factual', 'adapted', 'fictional']) contentLevel!: 'factual' | 'adapted' | 'fictional';
  /** Operator direction: angle, audience, tone. */
  @IsString() direction!: string;
  @IsOptional() @IsArray() patternIds?: string[];
  @IsOptional() @IsArray() trendSignalIds?: string[];
}
