import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  candidateStatuses,
  opportunityStatuses,
  opportunityTypes,
  patternStatuses,
  recordStatuses,
  referenceStatuses,
  trendSignalTypes,
  type ActorContext,
  type CatOpportunityInput,
  type ReferenceContentInput,
  type ScoreTopicInput,
  type TopicCandidateInput,
  type TrendSignalInput,
  type ViralPatternInput,
} from "../domain/topic-engine-records.ts";
import {
  contentLevels,
  scoreTopicCandidate,
  topicFormats,
  topicPlatforms,
  validateTopicCandidate,
  type TopicSignals,
} from "../domain/topic-engine.ts";

const SCORING_VERSION = "topic-score-v1";

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function required(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`invalid_${field}`);
  }
  return value.trim();
}

function optional(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stringArray(value: unknown, field: string, minimum = 0): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`invalid_${field}`);
  }
  const normalized = [...new Set(value.map((item) => item.trim()))];
  if (normalized.length < minimum) throw new Error(`invalid_${field}`);
  return normalized;
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  field: string,
): T[number] {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new Error(`invalid_${field}`);
  }
  return value as T[number];
}

function unit(value: unknown, field: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    throw new Error(`invalid_${field}`);
  }
  return numeric;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export class TopicEngineRepository {
  private readonly database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.database = database;
  }

  private audit(
    action: string,
    entityType: string,
    entityId: string,
    actor: ActorContext,
    metadata: unknown = {},
  ): void {
    this.database
      .prepare(`
        INSERT INTO audit_logs
          (id, actor_type, actor_id, action, entity_type, entity_id, metadata_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        randomUUID(),
        actor.actorType ?? "admin_api",
        actor.actorId ?? null,
        action,
        entityType,
        entityId,
        JSON.stringify(metadata),
        new Date().toISOString(),
      );
  }

  saveTrend(input: TrendSignalInput, actor: ActorContext = {}): Record<string, unknown> {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    const existing = this.database
      .prepare("SELECT created_at FROM trend_signals WHERE id = ?")
      .get(id) as { created_at: string } | undefined;
    const signalType = enumValue(input.signalType, trendSignalTypes, "signal_type");
    const status = enumValue(input.status ?? "active", recordStatuses, "status");
    if (input.platform != null) enumValue(input.platform, topicPlatforms, "platform");

    this.database
      .prepare(`
        INSERT INTO trend_signals (
          id, signal_type, title, description, platform, signal_strength, starts_at, expires_at,
          source_url, metadata_json, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          signal_type=excluded.signal_type,
          title=excluded.title,
          description=excluded.description,
          platform=excluded.platform,
          signal_strength=excluded.signal_strength,
          starts_at=excluded.starts_at,
          expires_at=excluded.expires_at,
          source_url=excluded.source_url,
          metadata_json=excluded.metadata_json,
          status=excluded.status,
          updated_at=excluded.updated_at
      `)
      .run(
        id,
        signalType,
        required(input.title, "title"),
        optional(input.description),
        input.platform ?? null,
        unit(input.signalStrength, "signal_strength"),
        optional(input.startsAt),
        optional(input.expiresAt),
        optional(input.sourceUrl),
        JSON.stringify(objectValue(input.metadata)),
        status,
        actor.actorId ?? null,
        existing?.created_at ?? now,
        now,
      );

    this.audit(existing ? "topic.trend.updated" : "topic.trend.created", "trend_signal", id, actor);
    return this.getTrend(id)!;
  }

  listTrends(status?: string): Record<string, unknown>[] {
    const rows = status
      ? this.database
          .prepare("SELECT * FROM trend_signals WHERE status = ? ORDER BY updated_at DESC")
          .all(status)
      : this.database.prepare("SELECT * FROM trend_signals ORDER BY updated_at DESC").all();
    return (rows as Record<string, unknown>[]).map((row) => this.hydrateTrend(row));
  }

  getTrend(id: string): Record<string, unknown> | null {
    const row = this.database.prepare("SELECT * FROM trend_signals WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.hydrateTrend(row) : null;
  }

  private hydrateTrend(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: row.id,
      signalType: row.signal_type,
      title: row.title,
      description: row.description,
      platform: row.platform,
      signalStrength: Number(row.signal_strength),
      startsAt: row.starts_at,
      expiresAt: row.expires_at,
      sourceUrl: row.source_url,
      metadata: parseJson(row.metadata_json, {}),
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  saveReference(input: ReferenceContentInput, actor: ActorContext = {}): Record<string, unknown> {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    const existing = this.database
      .prepare("SELECT created_at FROM reference_contents WHERE id = ?")
      .get(id) as { created_at: string } | undefined;
    const platform = enumValue(input.platform, topicPlatforms, "platform");
    const status = enumValue(input.status ?? "pending", referenceStatuses, "status");

    this.database
      .prepare(`
        INSERT INTO reference_contents (
          id, platform, url, title, summary, metrics_json, published_at, captured_at,
          status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          platform=excluded.platform,
          url=excluded.url,
          title=excluded.title,
          summary=excluded.summary,
          metrics_json=excluded.metrics_json,
          published_at=excluded.published_at,
          captured_at=excluded.captured_at,
          status=excluded.status,
          updated_at=excluded.updated_at
      `)
      .run(
        id,
        platform,
        required(input.url, "url"),
        optional(input.title),
        required(input.summary, "summary"),
        JSON.stringify(objectValue(input.metrics)),
        optional(input.publishedAt),
        input.capturedAt ?? now,
        status,
        actor.actorId ?? null,
        existing?.created_at ?? now,
        now,
      );

    this.audit(
      existing ? "topic.reference.updated" : "topic.reference.created",
      "reference_content",
      id,
      actor,
    );
    return this.getReference(id)!;
  }

  listReferences(platform?: string): Record<string, unknown>[] {
    const rows = platform
      ? this.database
          .prepare("SELECT * FROM reference_contents WHERE platform = ? ORDER BY captured_at DESC")
          .all(platform)
      : this.database.prepare("SELECT * FROM reference_contents ORDER BY captured_at DESC").all();
    return (rows as Record<string, unknown>[]).map((row) => this.hydrateReference(row));
  }

  getReference(id: string): Record<string, unknown> | null {
    const row = this.database.prepare("SELECT * FROM reference_contents WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.hydrateReference(row) : null;
  }

  private hydrateReference(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: row.id,
      platform: row.platform,
      url: row.url,
      title: row.title,
      summary: row.summary,
      metrics: parseJson(row.metrics_json, {}),
      publishedAt: row.published_at,
      capturedAt: row.captured_at,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  savePattern(input: ViralPatternInput, actor: ActorContext = {}): Record<string, unknown> {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    const existing = this.database
      .prepare("SELECT created_at FROM viral_patterns WHERE id = ?")
      .get(id) as { created_at: string } | undefined;
    const status = enumValue(input.status ?? "draft", patternStatuses, "status");
    const sourceIds = stringArray(input.sourceReferenceIds ?? [], "source_reference_ids");

    for (const sourceId of sourceIds) {
      if (!this.getReference(sourceId)) throw new Error(`reference_not_found:${sourceId}`);
    }

    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`
          INSERT INTO viral_patterns (
            id, name, category, hook_pattern, narrative_structure_json, emotion_curve_json,
            visual_grammar_json, interaction_mechanism, prohibited_elements_json,
            status, created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            name=excluded.name,
            category=excluded.category,
            hook_pattern=excluded.hook_pattern,
            narrative_structure_json=excluded.narrative_structure_json,
            emotion_curve_json=excluded.emotion_curve_json,
            visual_grammar_json=excluded.visual_grammar_json,
            interaction_mechanism=excluded.interaction_mechanism,
            prohibited_elements_json=excluded.prohibited_elements_json,
            status=excluded.status,
            updated_at=excluded.updated_at
        `)
        .run(
          id,
          required(input.name, "name"),
          required(input.category, "category"),
          required(input.hookPattern, "hook_pattern"),
          JSON.stringify(stringArray(input.narrativeStructure, "narrative_structure", 1)),
          JSON.stringify(stringArray(input.emotionCurve ?? [], "emotion_curve")),
          JSON.stringify(stringArray(input.visualGrammar ?? [], "visual_grammar")),
          optional(input.interactionMechanism),
          JSON.stringify(stringArray(input.prohibitedElements ?? [], "prohibited_elements")),
          status,
          actor.actorId ?? null,
          existing?.created_at ?? now,
          now,
        );

      this.database.prepare("DELETE FROM pattern_source_links WHERE pattern_id = ?").run(id);
      const link = this.database.prepare(`
        INSERT INTO pattern_source_links (pattern_id, reference_content_id, created_at)
        VALUES (?, ?, ?)
      `);
      for (const sourceId of sourceIds) link.run(id, sourceId, now);

      this.audit(
        existing ? "topic.pattern.updated" : "topic.pattern.created",
        "viral_pattern",
        id,
        actor,
        { sourceReferenceIds: sourceIds },
      );
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return this.getPattern(id)!;
  }

  listPatterns(status?: string): Record<string, unknown>[] {
    const rows = status
      ? this.database
          .prepare("SELECT * FROM viral_patterns WHERE status = ? ORDER BY updated_at DESC")
          .all(status)
      : this.database.prepare("SELECT * FROM viral_patterns ORDER BY updated_at DESC").all();
    return (rows as Record<string, unknown>[]).map((row) => this.hydratePattern(row));
  }

  getPattern(id: string): Record<string, unknown> | null {
    const row = this.database.prepare("SELECT * FROM viral_patterns WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.hydratePattern(row) : null;
  }

  private hydratePattern(row: Record<string, unknown>): Record<string, unknown> {
    const sourceRows = this.database
      .prepare(`
        SELECT reference_content_id AS id
        FROM pattern_source_links
        WHERE pattern_id = ?
        ORDER BY created_at ASC
      `)
      .all(String(row.id)) as { id: string }[];

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      hookPattern: row.hook_pattern,
      narrativeStructure: parseJson(row.narrative_structure_json, []),
      emotionCurve: parseJson(row.emotion_curve_json, []),
      visualGrammar: parseJson(row.visual_grammar_json, []),
      interactionMechanism: row.interaction_mechanism,
      prohibitedElements: parseJson(row.prohibited_elements_json, []),
      sourceReferenceIds: sourceRows.map((item) => item.id),
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  saveOpportunity(input: CatOpportunityInput, actor: ActorContext = {}): Record<string, unknown> {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    const existing = this.database
      .prepare("SELECT created_at FROM cat_content_opportunities WHERE id = ?")
      .get(id) as { created_at: string } | undefined;

    if (!this.database.prepare("SELECT 1 FROM cat_assets WHERE id = ?").get(input.catId)) {
      throw new Error("cat_not_found");
    }

    const type = enumValue(input.opportunityType, opportunityTypes, "opportunity_type");
    const status = enumValue(input.status ?? "active", opportunityStatuses, "status");

    this.database
      .prepare(`
        INSERT INTO cat_content_opportunities (
          id, cat_asset_id, opportunity_type, summary, unique_facts_json, available_assets_json,
          business_goals_json, valid_until, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          cat_asset_id=excluded.cat_asset_id,
          opportunity_type=excluded.opportunity_type,
          summary=excluded.summary,
          unique_facts_json=excluded.unique_facts_json,
          available_assets_json=excluded.available_assets_json,
          business_goals_json=excluded.business_goals_json,
          valid_until=excluded.valid_until,
          status=excluded.status,
          updated_at=excluded.updated_at
      `)
      .run(
        id,
        required(input.catId, "cat_id"),
        type,
        required(input.summary, "summary"),
        JSON.stringify(stringArray(input.uniqueFacts, "unique_facts", 1)),
        JSON.stringify(stringArray(input.availableAssets, "available_assets", 1)),
        JSON.stringify(stringArray(input.businessGoals ?? [], "business_goals")),
        optional(input.validUntil),
        status,
        actor.actorId ?? null,
        existing?.created_at ?? now,
        now,
      );

    this.audit(
      existing ? "topic.opportunity.updated" : "topic.opportunity.created",
      "cat_content_opportunity",
      id,
      actor,
    );
    return this.getOpportunity(id)!;
  }

  listOpportunities(options: { catId?: string; status?: string } = {}): Record<string, unknown>[] {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.catId) {
      conditions.push("cat_asset_id = ?");
      values.push(options.catId);
    }
    if (options.status) {
      conditions.push("status = ?");
      values.push(options.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.database
      .prepare(`SELECT * FROM cat_content_opportunities ${where} ORDER BY updated_at DESC`)
      .all(...values) as Record<string, unknown>[];
    return rows.map((row) => this.hydrateOpportunity(row));
  }

  getOpportunity(id: string): Record<string, unknown> | null {
    const row = this.database
      .prepare("SELECT * FROM cat_content_opportunities WHERE id = ?")
      .get(id) as Record<string, unknown> | undefined;
    return row ? this.hydrateOpportunity(row) : null;
  }

  private hydrateOpportunity(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: row.id,
      catId: row.cat_asset_id,
      opportunityType: row.opportunity_type,
      summary: row.summary,
      uniqueFacts: parseJson(row.unique_facts_json, []),
      availableAssets: parseJson(row.available_assets_json, []),
      businessGoals: parseJson(row.business_goals_json, []),
      validUntil: row.valid_until,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  saveCandidate(input: TopicCandidateInput, actor: ActorContext = {}): Record<string, unknown> {
    const id = input.id ?? randomUUID();
    const now = new Date().toISOString();
    const existing = this.database
      .prepare("SELECT created_at FROM topic_candidates WHERE id = ?")
      .get(id) as { created_at: string } | undefined;

    if (!this.database.prepare("SELECT 1 FROM cat_assets WHERE id = ?").get(input.catId)) {
      throw new Error("cat_not_found");
    }

    const platform = enumValue(input.platform, topicPlatforms, "platform");
    const format = enumValue(input.format, topicFormats, "format");
    const contentLevel = enumValue(input.contentLevel, contentLevels, "content_level");
    const status = "draft";
    const normalized = {
      id,
      catId: required(input.catId, "cat_id"),
      platform,
      format,
      contentLevel,
      premise: required(input.premise, "premise"),
      audienceReason: required(input.audienceReason, "audience_reason"),
      hook: required(input.hook, "hook"),
      storyBeats: stringArray(input.storyBeats, "story_beats", 3),
      patternIds: stringArray(input.patternIds, "pattern_ids", 1),
      factSourceIds: stringArray(input.factSourceIds, "fact_source_ids", 1),
      assetRequirements: stringArray(input.assetRequirements, "asset_requirements", 1),
      originalityConstraints: stringArray(
        input.originalityConstraints,
        "originality_constraints",
        1,
      ),
    };

    const issues = validateTopicCandidate(normalized);
    if (issues.length > 0) {
      throw new Error(`invalid_topic_candidate:${issues.join(",")}`);
    }

    const trendIds = stringArray(input.trendSignalIds ?? [], "trend_signal_ids");
    for (const patternId of normalized.patternIds) {
      if (!this.getPattern(patternId)) throw new Error(`pattern_not_found:${patternId}`);
    }
    for (const trendId of trendIds) {
      if (!this.getTrend(trendId)) throw new Error(`trend_not_found:${trendId}`);
    }

    this.database
      .prepare(`
        INSERT INTO topic_candidates (
          id, cat_asset_id, platform, format, content_level, premise, audience_reason, hook,
          story_beats_json, trend_signal_ids_json, pattern_ids_json, fact_source_ids_json,
          asset_requirements_json, originality_constraints_json, status, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          cat_asset_id=excluded.cat_asset_id,
          platform=excluded.platform,
          format=excluded.format,
          content_level=excluded.content_level,
          premise=excluded.premise,
          audience_reason=excluded.audience_reason,
          hook=excluded.hook,
          story_beats_json=excluded.story_beats_json,
          trend_signal_ids_json=excluded.trend_signal_ids_json,
          pattern_ids_json=excluded.pattern_ids_json,
          fact_source_ids_json=excluded.fact_source_ids_json,
          asset_requirements_json=excluded.asset_requirements_json,
          originality_constraints_json=excluded.originality_constraints_json,
          signals_json=NULL,
          score_json=NULL,
          total_score=NULL,
          score_decision=NULL,
          status=excluded.status,
          updated_at=excluded.updated_at
      `)
      .run(
        id,
        normalized.catId,
        platform,
        format,
        contentLevel,
        normalized.premise,
        normalized.audienceReason,
        normalized.hook,
        JSON.stringify(normalized.storyBeats),
        JSON.stringify(trendIds),
        JSON.stringify(normalized.patternIds),
        JSON.stringify(normalized.factSourceIds),
        JSON.stringify(normalized.assetRequirements),
        JSON.stringify(normalized.originalityConstraints),
        status,
        actor.actorId ?? null,
        existing?.created_at ?? now,
        now,
      );

    this.audit(
      existing ? "topic.candidate.updated" : "topic.candidate.created",
      "topic_candidate",
      id,
      actor,
    );
    return this.getCandidate(id)!;
  }

  scoreCandidate(
    id: string,
    input: ScoreTopicInput,
    actor: ActorContext = {},
  ): Record<string, unknown> {
    if (!this.getCandidate(id)) throw new Error("topic_candidate_not_found");
    const signals = this.normalizeSignals(input.signals);
    const result = scoreTopicCandidate(signals);
    const now = new Date().toISOString();

    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`
          UPDATE topic_candidates
          SET signals_json = ?, score_json = ?, total_score = ?, score_decision = ?,
              status = ?, updated_at = ?
          WHERE id = ?
        `)
        .run(
          JSON.stringify(signals),
          JSON.stringify(result),
          result.totalScore,
          result.decision,
          result.decision,
          now,
          id,
        );

      this.database
        .prepare(`
          INSERT INTO topic_score_runs (
            id, topic_candidate_id, signals_json, result_json, scoring_version, created_by, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          randomUUID(),
          id,
          JSON.stringify(signals),
          JSON.stringify(result),
          input.scoringVersion ?? SCORING_VERSION,
          actor.actorId ?? null,
          now,
        );

      this.audit("topic.candidate.scored", "topic_candidate", id, actor, {
        decision: result.decision,
        totalScore: result.totalScore,
      });
      this.database.exec("COMMIT");
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }

    return this.getCandidate(id)!;
  }

  updateCandidateStatus(
    id: string,
    statusInput: string,
    actor: ActorContext = {},
  ): Record<string, unknown> {
    const candidate = this.getCandidate(id);
    if (!candidate) throw new Error("topic_candidate_not_found");
    const status = enumValue(statusInput, candidateStatuses, "status");

    if (
      ["recommended", "review", "rejected", "blocked", "selected"].includes(status) &&
      candidate.score == null
    ) {
      throw new Error("candidate_must_be_scored");
    }

    this.database
      .prepare("UPDATE topic_candidates SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, new Date().toISOString(), id);
    this.audit("topic.candidate.status_changed", "topic_candidate", id, actor, {
      from: candidate.status,
      to: status,
    });
    return this.getCandidate(id)!;
  }

  listCandidates(
    options: { catId?: string; platform?: string; status?: string } = {},
  ): Record<string, unknown>[] {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.catId) {
      conditions.push("cat_asset_id = ?");
      values.push(options.catId);
    }
    if (options.platform) {
      conditions.push("platform = ?");
      values.push(options.platform);
    }
    if (options.status) {
      conditions.push("status = ?");
      values.push(options.status);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.database
      .prepare(`
        SELECT * FROM topic_candidates ${where}
        ORDER BY CASE WHEN total_score IS NULL THEN 1 ELSE 0 END,
                 total_score DESC,
                 updated_at DESC
      `)
      .all(...values) as Record<string, unknown>[];
    return rows.map((row) => this.hydrateCandidate(row));
  }

  getCandidate(id: string): Record<string, any> | null {
    const row = this.database.prepare("SELECT * FROM topic_candidates WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    if (!row) return null;

    const scoreRuns = this.database
      .prepare(`
        SELECT id, signals_json, result_json, scoring_version, created_by, created_at
        FROM topic_score_runs
        WHERE topic_candidate_id = ?
        ORDER BY created_at DESC
      `)
      .all(id) as Record<string, unknown>[];

    return {
      ...this.hydrateCandidate(row),
      scoreRuns: scoreRuns.map((item) => ({
        id: item.id,
        signals: parseJson(item.signals_json, {}),
        result: parseJson(item.result_json, {}),
        scoringVersion: item.scoring_version,
        createdBy: item.created_by,
        createdAt: item.created_at,
      })),
    };
  }

  private hydrateCandidate(row: Record<string, unknown>): Record<string, unknown> {
    return {
      id: row.id,
      catId: row.cat_asset_id,
      platform: row.platform,
      format: row.format,
      contentLevel: row.content_level,
      premise: row.premise,
      audienceReason: row.audience_reason,
      hook: row.hook,
      storyBeats: parseJson(row.story_beats_json, []),
      trendSignalIds: parseJson(row.trend_signal_ids_json, []),
      patternIds: parseJson(row.pattern_ids_json, []),
      factSourceIds: parseJson(row.fact_source_ids_json, []),
      assetRequirements: parseJson(row.asset_requirements_json, []),
      originalityConstraints: parseJson(row.originality_constraints_json, []),
      signals: parseJson(row.signals_json, null),
      score: parseJson(row.score_json, null),
      totalScore: row.total_score == null ? null : Number(row.total_score),
      scoreDecision: row.score_decision,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private normalizeSignals(signals: TopicSignals): TopicSignals {
    const keys: (keyof TopicSignals)[] = [
      "trendRelevance",
      "catFit",
      "humanInterest",
      "novelty",
      "platformFit",
      "assetFeasibility",
      "adoptionOrBrandValue",
      "timeliness",
      "sourceSimilarityRisk",
      "copyrightRisk",
      "factualRisk",
      "audienceFatigueRisk",
    ];
    return Object.fromEntries(
      keys.map((key) => [key, unit(signals?.[key], key)]),
    ) as unknown as TopicSignals;
  }
}
