import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import type { PublicCatAsset, SanitizationIssue } from "../domain/cat-asset.ts";

export type UpsertOutcome = "inserted" | "updated" | "unchanged";

export interface StoredCatAsset extends PublicCatAsset {
  id: string;
  sourceHash: string;
  createdAt: string;
  updatedAt: string;
}

export class CatAssetRepository {
  private readonly database: DatabaseSync;

  constructor(database: DatabaseSync) {
    this.database = database;
  }

  createSyncJob(mode: "full" | "incremental" | "single" | "fixture"): string {
    const id = randomUUID();
    this.database
      .prepare("INSERT INTO source_sync_jobs (id, mode, status, started_at) VALUES (?, ?, 'running', ?)")
      .run(id, mode, new Date().toISOString());
    return id;
  }

  completeSyncJob(
    id: string,
    counts: { read: number; inserted: number; updated: number; unchanged: number; errors: number },
    errorSummary: string | null = null,
  ): void {
    this.database
      .prepare(`
        UPDATE source_sync_jobs
        SET status = ?, finished_at = ?, read_count = ?, inserted_count = ?, updated_count = ?,
            unchanged_count = ?, error_count = ?, error_summary = ?
        WHERE id = ?
      `)
      .run(
        counts.errors > 0 ? "failed" : "completed",
        new Date().toISOString(),
        counts.read,
        counts.inserted,
        counts.updated,
        counts.unchanged,
        counts.errors,
        errorSummary,
        id,
      );
  }

  upsert(
    syncJobId: string,
    asset: PublicCatAsset,
    sourceHash: string,
    issues: SanitizationIssue[],
  ): UpsertOutcome {
    const existing = this.database
      .prepare("SELECT id, source_hash AS sourceHash FROM cat_assets WHERE source_id = ?")
      .get(asset.sourceId) as { id: string; sourceHash: string } | undefined;

    const now = new Date().toISOString();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      this.database
        .prepare(`
          INSERT INTO source_cat_snapshots
            (source_id, sync_job_id, source_updated_at, source_hash, sanitized_json, issues_json, synced_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            sync_job_id = excluded.sync_job_id,
            source_updated_at = excluded.source_updated_at,
            source_hash = excluded.source_hash,
            sanitized_json = excluded.sanitized_json,
            issues_json = excluded.issues_json,
            synced_at = excluded.synced_at
        `)
        .run(
          asset.sourceId,
          syncJobId,
          asset.sourceUpdatedAt,
          sourceHash,
          JSON.stringify(asset),
          JSON.stringify(issues),
          now,
        );

      if (existing?.sourceHash === sourceHash) {
        this.database.exec("COMMIT");
        return "unchanged";
      }

      const id = existing?.id ?? randomUUID();
      this.database
        .prepare(`
          INSERT INTO cat_assets (
            id, source_id, name, sex, approximate_age_months, breed, coat_color,
            adoption_status, public_description, public_rescue_story,
            public_personality_notes, source_updated_at, source_hash, is_public,
            completeness_score, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(source_id) DO UPDATE SET
            name = excluded.name,
            sex = excluded.sex,
            approximate_age_months = excluded.approximate_age_months,
            breed = excluded.breed,
            coat_color = excluded.coat_color,
            adoption_status = excluded.adoption_status,
            public_description = excluded.public_description,
            public_rescue_story = excluded.public_rescue_story,
            public_personality_notes = excluded.public_personality_notes,
            source_updated_at = excluded.source_updated_at,
            source_hash = excluded.source_hash,
            is_public = excluded.is_public,
            completeness_score = excluded.completeness_score,
            updated_at = excluded.updated_at
        `)
        .run(
          id,
          asset.sourceId,
          asset.name,
          asset.sex,
          asset.approximateAgeMonths,
          asset.breed,
          asset.coatColor,
          asset.adoptionStatus,
          asset.publicDescription,
          asset.publicRescueStory,
          asset.publicPersonalityNotes,
          asset.sourceUpdatedAt,
          sourceHash,
          asset.isPublic ? 1 : 0,
          asset.completenessScore,
          existing ? this.createdAtFor(id) : now,
          now,
        );

      this.database.prepare("DELETE FROM cat_media_assets WHERE cat_asset_id = ?").run(id);
      const insertMedia = this.database.prepare(`
        INSERT INTO cat_media_assets
          (id, cat_asset_id, source_media_id, url, kind, usage_scope, alt_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const media of asset.media) {
        insertMedia.run(
          randomUUID(),
          id,
          media.sourceMediaId,
          media.url,
          media.kind,
          media.usageScope,
          media.altText,
          now,
          now,
        );
      }

      this.database.exec("COMMIT");
      return existing ? "updated" : "inserted";
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  private createdAtFor(id: string): string {
    const row = this.database.prepare("SELECT created_at AS createdAt FROM cat_assets WHERE id = ?").get(id) as
      | { createdAt: string }
      | undefined;
    return row?.createdAt ?? new Date().toISOString();
  }

  list(options: { adoptionStatus?: string; publicOnly?: boolean } = {}): StoredCatAsset[] {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (options.adoptionStatus) {
      conditions.push("adoption_status = ?");
      values.push(options.adoptionStatus);
    }
    if (options.publicOnly !== false) {
      conditions.push("is_public = 1");
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.database
      .prepare(`SELECT * FROM cat_assets ${where} ORDER BY updated_at DESC`)
      .all(...values) as Record<string, unknown>[];
    return rows.map((row) => this.hydrate(row));
  }

  getById(id: string): StoredCatAsset | null {
    const row = this.database.prepare("SELECT * FROM cat_assets WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? this.hydrate(row) : null;
  }

  getBySourceId(sourceId: string): StoredCatAsset | null {
    const row = this.database.prepare("SELECT * FROM cat_assets WHERE source_id = ?").get(sourceId) as
      | Record<string, unknown>
      | undefined;
    return row ? this.hydrate(row) : null;
  }

  private hydrate(row: Record<string, unknown>): StoredCatAsset {
    const mediaRows = this.database
      .prepare(`
        SELECT source_media_id AS sourceMediaId, url, kind, usage_scope AS usageScope, alt_text AS altText
        FROM cat_media_assets WHERE cat_asset_id = ? ORDER BY created_at ASC
      `)
      .all(row.id) as StoredCatAsset["media"];

    return {
      id: String(row.id),
      sourceId: String(row.source_id),
      name: String(row.name),
      sex: row.sex as StoredCatAsset["sex"],
      approximateAgeMonths:
        row.approximate_age_months == null ? null : Number(row.approximate_age_months),
      breed: row.breed == null ? null : String(row.breed),
      coatColor: row.coat_color == null ? null : String(row.coat_color),
      adoptionStatus: row.adoption_status as StoredCatAsset["adoptionStatus"],
      publicDescription: row.public_description == null ? null : String(row.public_description),
      publicRescueStory: row.public_rescue_story == null ? null : String(row.public_rescue_story),
      publicPersonalityNotes:
        row.public_personality_notes == null ? null : String(row.public_personality_notes),
      sourceUpdatedAt: String(row.source_updated_at),
      sourceHash: String(row.source_hash),
      isPublic: Number(row.is_public) === 1,
      completenessScore: Number(row.completeness_score),
      media: mediaRows,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }
}
