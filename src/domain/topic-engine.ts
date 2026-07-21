export const topicPlatforms = [
  "xiaohongshu",
  "douyin",
  "wechat_official",
  "wechat_channels",
  "bilibili",
] as const;

export type TopicPlatform = (typeof topicPlatforms)[number];

export const topicFormats = ["carousel", "article", "short_video", "long_video"] as const;
export type TopicFormat = (typeof topicFormats)[number];

export const contentLevels = ["factual", "adapted", "fictional"] as const;
export type ContentLevel = (typeof contentLevels)[number];

export type TopicDecision = "recommended" | "review" | "rejected" | "blocked";

export interface TopicSignals {
  trendRelevance: number;
  catFit: number;
  humanInterest: number;
  novelty: number;
  platformFit: number;
  assetFeasibility: number;
  adoptionOrBrandValue: number;
  timeliness: number;
  sourceSimilarityRisk: number;
  copyrightRisk: number;
  factualRisk: number;
  audienceFatigueRisk: number;
}

export interface TopicScoreBreakdown {
  positiveScore: number;
  penaltyScore: number;
  totalScore: number;
  decision: TopicDecision;
  hardBlockReasons: string[];
  contributions: Record<string, number>;
}

export interface TopicCandidate {
  id: string;
  catId: string;
  platform: TopicPlatform;
  format: TopicFormat;
  contentLevel: ContentLevel;
  premise: string;
  audienceReason: string;
  hook: string;
  storyBeats: string[];
  patternIds: string[];
  factSourceIds: string[];
  assetRequirements: string[];
  originalityConstraints: string[];
  score?: TopicScoreBreakdown;
}

const positiveWeights = {
  trendRelevance: 18,
  catFit: 18,
  humanInterest: 16,
  novelty: 14,
  platformFit: 12,
  assetFeasibility: 8,
  adoptionOrBrandValue: 8,
  timeliness: 6,
} as const;

const penaltyWeights = {
  sourceSimilarityRisk: 35,
  copyrightRisk: 30,
  factualRisk: 20,
  audienceFatigueRisk: 15,
} as const;

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function scoreTopicCandidate(signals: TopicSignals): TopicScoreBreakdown {
  const normalized = Object.fromEntries(
    Object.entries(signals).map(([key, value]) => [key, clampUnit(value)]),
  ) as unknown as TopicSignals;

  const contributions: Record<string, number> = {};

  const positiveScore = Object.entries(positiveWeights).reduce((sum, [key, weight]) => {
    const contribution = normalized[key as keyof TopicSignals] * weight;
    contributions[key] = round(contribution);
    return sum + contribution;
  }, 0);

  const penaltyScore = Object.entries(penaltyWeights).reduce((sum, [key, weight]) => {
    const contribution = normalized[key as keyof TopicSignals] * weight;
    contributions[key] = round(-contribution);
    return sum + contribution;
  }, 0);

  const hardBlockReasons: string[] = [];

  if (normalized.sourceSimilarityRisk >= 0.85) {
    hardBlockReasons.push("source_similarity_risk");
  }
  if (normalized.copyrightRisk >= 0.8) {
    hardBlockReasons.push("copyright_risk");
  }
  if (normalized.factualRisk >= 0.9) {
    hardBlockReasons.push("factual_risk");
  }

  const totalScore = round(Math.max(0, Math.min(100, positiveScore - penaltyScore)));

  let decision: TopicDecision;
  if (hardBlockReasons.length > 0) {
    decision = "blocked";
  } else if (totalScore >= 75) {
    decision = "recommended";
  } else if (totalScore >= 60) {
    decision = "review";
  } else {
    decision = "rejected";
  }

  return {
    positiveScore: round(positiveScore),
    penaltyScore: round(penaltyScore),
    totalScore,
    decision,
    hardBlockReasons,
    contributions,
  };
}

export function validateTopicCandidate(candidate: TopicCandidate): string[] {
  const issues: string[] = [];

  if (!candidate.id.trim()) issues.push("missing_id");
  if (!candidate.catId.trim()) issues.push("missing_cat_id");
  if (!candidate.premise.trim()) issues.push("missing_premise");
  if (!candidate.audienceReason.trim()) issues.push("missing_audience_reason");
  if (!candidate.hook.trim()) issues.push("missing_hook");
  if (candidate.storyBeats.length < 3) issues.push("insufficient_story_beats");
  if (candidate.patternIds.length === 0) issues.push("missing_pattern");
  if (candidate.factSourceIds.length === 0) issues.push("missing_fact_sources");
  if (candidate.assetRequirements.length === 0) issues.push("missing_asset_requirements");
  if (candidate.originalityConstraints.length === 0) issues.push("missing_originality_constraints");

  return issues;
}
