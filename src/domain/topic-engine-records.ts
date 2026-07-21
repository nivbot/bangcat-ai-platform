import type { ContentLevel, TopicFormat, TopicPlatform, TopicSignals } from "./topic-engine.ts";

export const trendSignalTypes = [
  "platform_trend",
  "seasonal",
  "weather",
  "social_mood",
  "internal_event",
  "business_goal",
] as const;
export type TrendSignalType = (typeof trendSignalTypes)[number];

export const recordStatuses = ["active", "inactive", "archived"] as const;
export type RecordStatus = (typeof recordStatuses)[number];

export const referenceStatuses = ["pending", "analyzed", "approved", "rejected", "archived"] as const;
export type ReferenceStatus = (typeof referenceStatuses)[number];

export const patternStatuses = ["draft", "active", "archived"] as const;
export type PatternStatus = (typeof patternStatuses)[number];

export const opportunityTypes = [
  "unique_fact",
  "new_event",
  "visual_trait",
  "personality",
  "adoption_need",
  "series_role",
  "business_goal",
] as const;
export type OpportunityType = (typeof opportunityTypes)[number];

export const opportunityStatuses = ["active", "used", "expired", "archived"] as const;
export type OpportunityStatus = (typeof opportunityStatuses)[number];

export const candidateStatuses = [
  "draft",
  "scored",
  "recommended",
  "review",
  "rejected",
  "blocked",
  "selected",
  "archived",
] as const;
export type CandidateStatus = (typeof candidateStatuses)[number];

export interface ActorContext {
  actorType?: string;
  actorId?: string | null;
}

export interface TrendSignalInput {
  id?: string;
  signalType: TrendSignalType;
  title: string;
  description?: string | null;
  platform?: TopicPlatform | null;
  signalStrength: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown>;
  status?: RecordStatus;
}

export interface ReferenceContentInput {
  id?: string;
  platform: TopicPlatform;
  url: string;
  title?: string | null;
  summary: string;
  metrics?: Record<string, number>;
  publishedAt?: string | null;
  capturedAt?: string;
  status?: ReferenceStatus;
}

export interface ViralPatternInput {
  id?: string;
  name: string;
  category: string;
  hookPattern: string;
  narrativeStructure: string[];
  emotionCurve?: string[];
  visualGrammar?: string[];
  interactionMechanism?: string | null;
  prohibitedElements?: string[];
  sourceReferenceIds?: string[];
  status?: PatternStatus;
}

export interface CatOpportunityInput {
  id?: string;
  catId: string;
  opportunityType: OpportunityType;
  summary: string;
  uniqueFacts: string[];
  availableAssets: string[];
  businessGoals?: string[];
  validUntil?: string | null;
  status?: OpportunityStatus;
}

export interface TopicCandidateInput {
  id?: string;
  catId: string;
  platform: TopicPlatform;
  format: TopicFormat;
  contentLevel: ContentLevel;
  premise: string;
  audienceReason: string;
  hook: string;
  storyBeats: string[];
  trendSignalIds?: string[];
  patternIds: string[];
  factSourceIds: string[];
  assetRequirements: string[];
  originalityConstraints: string[];
  status?: CandidateStatus;
}

export interface ScoreTopicInput {
  signals: TopicSignals;
  scoringVersion?: string;
}
