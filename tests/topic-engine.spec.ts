import { describe, expect, it } from 'vitest';
import { scoreTopicCandidate, validateTopicCandidate } from '../src/domain/topic-engine.js';

const strongSignals = {
  trendRelevance: 0.9,
  catFit: 0.95,
  humanInterest: 0.9,
  novelty: 0.85,
  platformFit: 0.9,
  assetFeasibility: 0.9,
  adoptionOrBrandValue: 0.85,
  timeliness: 0.8,
  sourceSimilarityRisk: 0.05,
  copyrightRisk: 0.05,
  factualRisk: 0.05,
  audienceFatigueRisk: 0.1,
};

describe('topic engine scoring', () => {
  it('recommends strong original topics', () => {
    const result = scoreTopicCandidate(strongSignals);
    expect(result.decision).toBe('recommended');
    expect(result.totalScore).toBeGreaterThanOrEqual(75);
  });

  it('hard-blocks excessive similarity', () => {
    const result = scoreTopicCandidate({ ...strongSignals, sourceSimilarityRisk: 0.9 });
    expect(result.decision).toBe('blocked');
    expect(result.hardBlockReasons).toEqual(['source_similarity_risk']);
  });

  it('requires facts, patterns and production constraints', () => {
    expect(validateTopicCandidate({
      id: 'topic-1',
      catId: 'cat-1',
      platform: 'xiaohongshu',
      format: 'carousel',
      contentLevel: 'adapted',
      premise: '测试选题',
      audienceReason: '用户可代入',
      hook: '前三秒钩子',
      storyBeats: ['开场', '冲突'],
      patternIds: [],
      factSourceIds: [],
      assetRequirements: [],
      originalityConstraints: [],
    })).toEqual([
      'insufficient_story_beats',
      'missing_pattern',
      'missing_fact_sources',
      'missing_asset_requirements',
      'missing_originality_constraints',
    ]);
  });
});
