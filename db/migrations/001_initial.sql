PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS source_sync_jobs (
  id TEXT PRIMARY KEY,
  mode TEXT NOT NULL CHECK (mode IN ('full', 'incremental', 'single', 'fixture')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  finished_at TEXT,
  read_count INTEGER NOT NULL DEFAULT 0,
  inserted_count INTEGER NOT NULL DEFAULT 0,
  updated_count INTEGER NOT NULL DEFAULT 0,
  unchanged_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  error_summary TEXT
);

CREATE TABLE IF NOT EXISTS source_cat_snapshots (
  source_id TEXT PRIMARY KEY,
  sync_job_id TEXT NOT NULL,
  source_updated_at TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  sanitized_json TEXT NOT NULL,
  issues_json TEXT NOT NULL,
  synced_at TEXT NOT NULL,
  FOREIGN KEY (sync_job_id) REFERENCES source_sync_jobs(id)
);

CREATE TABLE IF NOT EXISTS cat_assets (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  sex TEXT NOT NULL,
  approximate_age_months INTEGER,
  breed TEXT,
  coat_color TEXT,
  adoption_status TEXT NOT NULL,
  public_description TEXT,
  public_rescue_story TEXT,
  public_personality_notes TEXT,
  source_updated_at TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  is_public INTEGER NOT NULL DEFAULT 1,
  completeness_score INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cat_media_assets (
  id TEXT PRIMARY KEY,
  cat_asset_id TEXT NOT NULL,
  source_media_id TEXT NOT NULL,
  url TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('image', 'video')),
  usage_scope TEXT NOT NULL,
  alt_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (cat_asset_id, source_media_id),
  FOREIGN KEY (cat_asset_id) REFERENCES cat_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cat_assets_adoption_status ON cat_assets(adoption_status);
CREATE INDEX IF NOT EXISTS idx_cat_assets_is_public ON cat_assets(is_public);
CREATE INDEX IF NOT EXISTS idx_cat_assets_updated_at ON cat_assets(updated_at);
