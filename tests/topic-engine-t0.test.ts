import assert from "node:assert/strict";
import test from "node:test";
import { openDatabase } from "../src/storage/sqlite-database.ts";
import { TopicEngineRepository } from "../src/storage/topic-engine-repository.ts";

function setup() {
  const database = openDatabase(":memory:");
  const now = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO cat_assets (
        id, source_id, name, sex, adoption_status, source_updated_at, source_hash,
        is_public, completeness_score, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      "cat-pocket",
      "source-pocket",
      "裤兜",
      "male",
      "available",
      now,
      "hash",
      1,
      90,
      now,
      now,
    );
  return { database, repository: new TopicEngineRepository(database) };
}

const actor = { actorType: "user", actorId: "operator-1" };
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

test("T0 persists the manual topic workflow and explainable score history", () => {
  const { database, repository } = setup();

  const trend = repository.saveTrend(
    {
      signalType: "social_mood",
      title: "打工人需要稳定陪伴",
      description: "办公室陪伴类内容近期互动较高",
      platform: "xiaohongshu",
      signalStrength: 0.8,
    },
    actor,
  ) as any;

  const reference = repository.saveReference(
    {
      platform: "xiaohongshu",
      url: "https://example.com/reference-1",
      title: "公司最稳定的员工",
      summary: "用身份错位制造悬念，最后揭晓主角是一只动物。",
      metrics: { likes: 12000, comments: 800 },
      status: "approved",
    },
    actor,
  ) as any;

  const pattern = repository.savePattern(
    {
      name: "身份错位揭晓",
      category: "reveal",
      hookPattern: "先给出反常身份结论，再延迟揭晓真实主角",
      narrativeStructure: ["异常结论", "连续证据", "身份揭晓", "情绪落点"],
      emotionCurve: ["好奇", "怀疑", "惊喜", "温暖"],
      sourceReferenceIds: [String(reference.id)],
      prohibitedElements: ["不得复用原标题", "不得逐句改写原正文"],
      status: "active",
    },
    actor,
  ) as any;

  const opportunity = repository.saveOpportunity(
    {
      catId: "cat-pocket",
      opportunityType: "personality",
      summary: "裤兜每天固定坐在窗边陪伴办公",
      uniqueFacts: ["每天上午会坐到玻璃窗边"],
      availableAssets: ["窗边坐姿照片", "办公室短视频"],
      businessGoals: ["促进领养", "建立陪伴型角色"],
    },
    actor,
  ) as any;

  const candidate = repository.saveCandidate(
    {
      catId: "cat-pocket",
      platform: "xiaohongshu",
      format: "carousel",
      contentLevel: "adapted",
      premise: "公司最稳定的同事是一只待领养猫",
      audienceReason: "打工人能代入稳定陪伴和办公室关系",
      hook: "我们公司最稳定的员工，从来没签过劳动合同。",
      storyBeats: ["抛出身份错位", "展示固定陪伴证据", "揭晓裤兜", "落到领养行动"],
      trendSignalIds: [String(trend.id)],
      patternIds: [String(pattern.id)],
      factSourceIds: [String(opportunity.id)],
      assetRequirements: ["窗边照片", "办公室陪伴视频"],
      originalityConstraints: ["不得复用参考标题", "故事必须基于裤兜真实行为"],
    },
    actor,
  ) as any;

  const scored = repository.scoreCandidate(
    String(candidate.id),
    { signals: strongSignals },
    actor,
  ) as any;

  assert.equal(scored.status, "recommended");
  assert.ok(Number(scored.totalScore) >= 75);
  assert.equal(scored.scoreRuns.length, 1);
  assert.deepEqual(repository.getPattern(String(pattern.id))?.sourceReferenceIds, [reference.id]);
  assert.equal(repository.listCandidates({ status: "recommended" }).length, 1);
  assert.equal(repository.listTrends("active").length, 1);
  assert.equal(repository.listOpportunities({ catId: "cat-pocket" }).length, 1);

  const edited = repository.saveCandidate(
    {
      ...candidate,
      id: String(candidate.id),
      premise: "公司里最稳定的陪伴者是一只待领养猫",
      trendSignalIds: [String(trend.id)],
      patternIds: [String(pattern.id)],
      factSourceIds: [String(opportunity.id)],
      assetRequirements: ["窗边照片"],
      originalityConstraints: ["不得复用参考标题"],
    },
    actor,
  ) as any;
  assert.equal(edited.status, "draft");
  assert.equal(edited.score, null);

  const auditCount = database
    .prepare("SELECT COUNT(*) AS count FROM audit_logs")
    .get() as { count: number };
  assert.equal(auditCount.count, 7);
  database.close();
});

test("T0 hard-blocks excessive similarity and records the decision", () => {
  const { database, repository } = setup();
  const reference = repository.saveReference({
    platform: "douyin",
    url: "https://example.com/video",
    summary: "反转视频结构",
    status: "approved",
  }) as any;
  const pattern = repository.savePattern({
    name: "反转",
    category: "reveal",
    hookPattern: "误导后揭晓",
    narrativeStructure: ["误导", "证据", "揭晓"],
    sourceReferenceIds: [String(reference.id)],
    status: "active",
  }) as any;
  const candidate = repository.saveCandidate({
    catId: "cat-pocket",
    platform: "douyin",
    format: "short_video",
    contentLevel: "adapted",
    premise: "裤兜值夜班",
    audienceReason: "反差",
    hook: "今晚值班的人没有工牌",
    storyBeats: ["值班画面", "异常细节", "揭晓猫咪"],
    patternIds: [String(pattern.id)],
    factSourceIds: ["fact-1"],
    assetRequirements: ["夜间视频"],
    originalityConstraints: ["重新设计镜头"],
  }) as any;
  const scored = repository.scoreCandidate(String(candidate.id), {
    signals: { ...strongSignals, sourceSimilarityRisk: 0.9 },
  }) as any;

  assert.equal(scored.status, "blocked");
  assert.deepEqual(scored.score.hardBlockReasons, ["source_similarity_risk"]);
  database.close();
});

test("T0 enforces linked records and candidate completeness", () => {
  const { database, repository } = setup();

  assert.throws(
    () =>
      repository.savePattern({
        name: "错误模式",
        category: "test",
        hookPattern: "test",
        narrativeStructure: ["a"],
        sourceReferenceIds: ["missing-reference"],
      }),
    /reference_not_found/,
  );

  assert.throws(
    () =>
      repository.saveCandidate({
        catId: "cat-pocket",
        platform: "xiaohongshu",
        format: "carousel",
        contentLevel: "factual",
        premise: "test",
        audienceReason: "test",
        hook: "test",
        storyBeats: ["a", "b"],
        patternIds: [],
        factSourceIds: [],
        assetRequirements: [],
        originalityConstraints: [],
      }),
    /invalid_story_beats|invalid_pattern_ids/,
  );

  database.close();
});
