PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS trend_signals (
  id TEXT PRIMARY KEY,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('platform_trend', 'seasonal', 'weather', 'social_mood', 'internal_event', 'business_goal')),
  title TEXT NOT NULL,
  description TEXT,
  platform TEXT,
  signal_strength REAL NOT NULL CHECK (signal_strength >= 0 AND signal_strength <= 1),
  starts_at TEXT,
  expires_at TEXT,
  source_url TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reference_contents (
  id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  summary TEXT NOT NULL,
  metrics_json TEXT NOT NULL DEFAULT '{}',
  published_at TEXT,
  captured_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'analyzed', 'approved', 'rejected', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (platform, url)
);

CREATE TABLE IF NOT EXISTS viral_patterns (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  hook_pattern TEXT NOT NULL,
  narrative_structure_json TEXT NOT NULL DEFAULT '[]',
  emotion_curve_json TEXT NOT NULL DEFAULT '[]',
  visual_grammar_json TEXT NOT NULL DEFAULT '[]',
  interaction_mechanism TEXT,
  prohibited_elements_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pattern_source_links (
  pattern_id TEXT NOT NULL,
  reference_content_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (pattern_id, reference_content_id),
  FOREIGN KEY (pattern_id) REFERENCES viral_patterns(id) ON DELETE CASCADE,
  FOREIGN KEY (reference_content_id) REFERENCES reference_contents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cat_content_opportunities (
  id TEXT PRIMARY KEY,
  cat_asset_id TEXT NOT NULL,
  opportunity_type TEXT NOT NULL CHECK (opportunity_type IN ('unique_fact', 'new_event', 'visual_trait', 'personality', 'adoption_need', 'series_role', 'business_goal')),
  summary TEXT NOT NULL,
  unique_facts_json TEXT NOT NULL DEFAULT '[]',
  available_assets_json TEXT NOT NULL DEFAULT '[]',
  business_goals_json TEXT NOT NULL DEFAULT '[]',
  valid_until TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cat_asset_id) REFERENCES cat_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_candidates (
  id TEXT PRIMARY KEY,
  cat_asset_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  format TEXT NOT NULL,
  content_level TEXT NOT NULL CHECK (content_level IN ('factual', 'adapted', 'fictional')),
  premise TEXT NOT NULL,
  audience_reason TEXT NOT NULL,
  hook TEXT NOT NULL,
  story_beats_json TEXT NOT NULL,
  trend_signal_ids_json TEXT NOT NULL DEFAULT '[]',
  pattern_ids_json TEXT NOT NULL,
  fact_source_ids_json TEXT NOT NULL,
  asset_requirements_json TEXT NOT NULL,
  originality_constraints_json TEXT NOT NULL,
  signals_json TEXT,
  score_json TEXT,
  total_score REAL,
  score_decision TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scored', 'recommended', 'review', 'rejected', 'blocked', 'selected', 'archived')),
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (cat_asset_id) REFERENCES cat_assets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS topic_score_runs (
  id TEXT PRIMARY KEY,
  topic_candidate_id TEXT NOT NULL,
  signals_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  scoring_version TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (topic_candidate_id) REFERENCES topic_candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trend_signals_status ON trend_signals(status);
CREATE INDEX IF NOT EXISTS idx_reference_contents_platform ON reference_contents(platform);
CREATE INDEX IF NOT EXISTS idx_viral_patterns_status ON viral_patterns(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_cat_status ON cat_content_opportunities(cat_asset_id, status);
CREATE INDEX IF NOT EXISTS idx_topic_candidates_status_score ON topic_candidates(status, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_topic_candidates_cat ON topic_candidates(cat_asset_id);
CREATE INDEX IF NOT EXISTS idx_topic_score_runs_candidate ON topic_score_runs(topic_candidate_id, created_at DESC);
