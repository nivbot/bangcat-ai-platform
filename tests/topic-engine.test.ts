import assert from "node:assert/strict";
import test from "node:test";
import {
  scoreTopicCandidate,
  validateTopicCandidate,
  type TopicCandidate,
  type TopicSignals,
} from "../src/domain/topic-engine.ts";

const strongSignals: TopicSignals = {
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

test("strong original topic is recommended with explainable contributions", () => {
  const result = scoreTopicCandidate(strongSignals);

  assert.equal(result.decision, "recommended");
  assert.ok(result.totalScore >= 75);
  assert.equal(result.hardBlockReasons.length, 0);
  assert.ok(result.contributions.catFit > 0);
  assert.ok(result.contributions.sourceSimilarityRisk < 0);
});

test("high source similarity blocks a candidate even when positive signals are strong", () => {
  const result = scoreTopicCandidate({
    ...strongSignals,
    sourceSimilarityRisk: 0.9,
  });

  assert.equal(result.decision, "blocked");
  assert.deepEqual(result.hardBlockReasons, ["source_similarity_risk"]);
});

test("high copyright and factual risks are independently visible", () => {
  const result = scoreTopicCandidate({
    ...strongSignals,
    copyrightRisk: 0.85,
    factualRisk: 0.95,
  });

  assert.equal(result.decision, "blocked");
  assert.deepEqual(result.hardBlockReasons, ["copyright_risk", "factual_risk"]);
});

test("topic candidate requires facts, patterns, assets and originality constraints", () => {
  const incomplete: TopicCandidate = {
    id: "topic-1",
    catId: "cat-pocket",
    platform: "xiaohongshu",
    format: "carousel",
    contentLevel: "adapted",
    premise: "公司里最稳定的同事是一只猫",
    audienceReason: "打工人容易代入",
    hook: "我们公司最稳定的员工，从来没签过劳动合同。",
    storyBeats: ["异常结论", "生活证据"],
    patternIds: [],
    factSourceIds: [],
    assetRequirements: [],
    originalityConstraints: [],
  };

  assert.deepEqual(validateTopicCandidate(incomplete), [
    "insufficient_story_beats",
    "missing_pattern",
    "missing_fact_sources",
    "missing_asset_requirements",
    "missing_originality_constraints",
  ]);
});
