-- CreateTable
CREATE TABLE `source_sync_jobs` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `mode` VARCHAR(32) NOT NULL,
    `status` VARCHAR(32) NOT NULL,
    `started_at` DATETIME(3) NOT NULL,
    `finished_at` DATETIME(3) NULL,
    `read_count` INTEGER NOT NULL DEFAULT 0,
    `inserted_count` INTEGER NOT NULL DEFAULT 0,
    `updated_count` INTEGER NOT NULL DEFAULT 0,
    `unchanged_count` INTEGER NOT NULL DEFAULT 0,
    `error_count` INTEGER NOT NULL DEFAULT 0,
    `error_summary` TEXT NULL,

    INDEX `source_sync_jobs_tenant_id_started_at_idx`(`tenant_id`, `started_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `source_cat_snapshots` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `source_id` VARCHAR(128) NOT NULL,
    `sync_job_id` VARCHAR(36) NOT NULL,
    `source_updated_at` DATETIME(3) NOT NULL,
    `source_hash` VARCHAR(128) NOT NULL,
    `sanitized_json` JSON NOT NULL,
    `issues_json` JSON NOT NULL,
    `synced_at` DATETIME(3) NOT NULL,

    INDEX `source_cat_snapshots_sync_job_id_idx`(`sync_job_id`),
    UNIQUE INDEX `source_cat_snapshots_tenant_id_source_id_key`(`tenant_id`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cat_assets` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `source_id` VARCHAR(128) NOT NULL,
    `name` VARCHAR(128) NOT NULL,
    `sex` VARCHAR(32) NOT NULL,
    `approximate_age_months` INTEGER NULL,
    `breed` VARCHAR(128) NULL,
    `coat_color` VARCHAR(128) NULL,
    `adoption_status` VARCHAR(64) NOT NULL,
    `public_description` TEXT NULL,
    `public_rescue_story` TEXT NULL,
    `public_personality_notes` TEXT NULL,
    `source_updated_at` DATETIME(3) NOT NULL,
    `source_hash` VARCHAR(128) NOT NULL,
    `is_public` BOOLEAN NOT NULL DEFAULT true,
    `completeness_score` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cat_assets_tenant_id_adoption_status_idx`(`tenant_id`, `adoption_status`),
    INDEX `cat_assets_tenant_id_is_public_idx`(`tenant_id`, `is_public`),
    UNIQUE INDEX `cat_assets_tenant_id_source_id_key`(`tenant_id`, `source_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cat_media_assets` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `cat_asset_id` VARCHAR(36) NOT NULL,
    `source_media_id` VARCHAR(128) NOT NULL,
    `source_url` TEXT NOT NULL,
    `storage_key` VARCHAR(512) NULL,
    `kind` VARCHAR(32) NOT NULL,
    `usage_scope` VARCHAR(64) NOT NULL,
    `alt_text` TEXT NULL,
    `content_hash` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cat_media_assets_tenant_id_cat_asset_id_idx`(`tenant_id`, `cat_asset_id`),
    UNIQUE INDEX `cat_media_assets_tenant_id_cat_asset_id_source_media_id_key`(`tenant_id`, `cat_asset_id`, `source_media_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `trend_signals` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `signal_type` VARCHAR(64) NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `platform` VARCHAR(64) NULL,
    `signal_strength` DECIMAL(6, 4) NOT NULL,
    `starts_at` DATETIME(3) NULL,
    `expires_at` DATETIME(3) NULL,
    `source_url` TEXT NULL,
    `metadata_json` JSON NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `created_by` VARCHAR(128) NULL,
    `updated_by` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `trend_signals_tenant_id_status_expires_at_idx`(`tenant_id`, `status`, `expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reference_contents` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `platform` VARCHAR(64) NOT NULL,
    `url` TEXT NOT NULL,
    `url_hash` VARCHAR(128) NOT NULL,
    `title` VARCHAR(512) NULL,
    `summary` TEXT NOT NULL,
    `metrics_json` JSON NOT NULL,
    `published_at` DATETIME(3) NULL,
    `captured_at` DATETIME(3) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'pending',
    `created_by` VARCHAR(128) NULL,
    `updated_by` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reference_contents_tenant_id_platform_status_idx`(`tenant_id`, `platform`, `status`),
    UNIQUE INDEX `reference_contents_tenant_id_platform_url_hash_key`(`tenant_id`, `platform`, `url_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `viral_patterns` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(64) NOT NULL,
    `hook_pattern` TEXT NOT NULL,
    `narrative_structure_json` JSON NOT NULL,
    `emotion_curve_json` JSON NOT NULL,
    `visual_grammar_json` JSON NOT NULL,
    `interaction_mechanism` TEXT NULL,
    `prohibited_elements_json` JSON NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
    `created_by` VARCHAR(128) NULL,
    `updated_by` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `viral_patterns_tenant_id_status_category_idx`(`tenant_id`, `status`, `category`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pattern_source_links` (
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `pattern_id` VARCHAR(36) NOT NULL,
    `reference_content_id` VARCHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `pattern_source_links_tenant_id_reference_content_id_idx`(`tenant_id`, `reference_content_id`),
    PRIMARY KEY (`tenant_id`, `pattern_id`, `reference_content_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cat_content_opportunities` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `cat_asset_id` VARCHAR(36) NOT NULL,
    `opportunity_type` VARCHAR(64) NOT NULL,
    `summary` TEXT NOT NULL,
    `unique_facts_json` JSON NOT NULL,
    `available_assets_json` JSON NOT NULL,
    `business_goals_json` JSON NOT NULL,
    `valid_until` DATETIME(3) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'active',
    `created_by` VARCHAR(128) NULL,
    `updated_by` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `cat_content_opportunities_tenant_id_cat_asset_id_status_idx`(`tenant_id`, `cat_asset_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topic_candidates` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `cat_asset_id` VARCHAR(36) NOT NULL,
    `platform` VARCHAR(64) NOT NULL,
    `format` VARCHAR(64) NOT NULL,
    `content_level` VARCHAR(32) NOT NULL,
    `premise` TEXT NOT NULL,
    `audience_reason` TEXT NOT NULL,
    `hook` TEXT NOT NULL,
    `story_beats_json` JSON NOT NULL,
    `fact_source_ids_json` JSON NOT NULL,
    `asset_requirements_json` JSON NOT NULL,
    `originality_constraints_json` JSON NOT NULL,
    `signals_json` JSON NULL,
    `score_json` JSON NULL,
    `total_score` DECIMAL(6, 2) NULL,
    `score_decision` VARCHAR(32) NULL,
    `score_version` VARCHAR(64) NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'draft',
    `created_by` VARCHAR(128) NULL,
    `updated_by` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `topic_candidates_tenant_id_status_total_score_idx`(`tenant_id`, `status`, `total_score`),
    INDEX `topic_candidates_tenant_id_cat_asset_id_idx`(`tenant_id`, `cat_asset_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topic_candidate_trends` (
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `topic_candidate_id` VARCHAR(36) NOT NULL,
    `trend_signal_id` VARCHAR(36) NOT NULL,

    INDEX `topic_candidate_trends_tenant_id_trend_signal_id_idx`(`tenant_id`, `trend_signal_id`),
    PRIMARY KEY (`tenant_id`, `topic_candidate_id`, `trend_signal_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topic_candidate_patterns` (
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `topic_candidate_id` VARCHAR(36) NOT NULL,
    `viral_pattern_id` VARCHAR(36) NOT NULL,

    INDEX `topic_candidate_patterns_tenant_id_viral_pattern_id_idx`(`tenant_id`, `viral_pattern_id`),
    PRIMARY KEY (`tenant_id`, `topic_candidate_id`, `viral_pattern_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topic_score_runs` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `topic_candidate_id` VARCHAR(36) NOT NULL,
    `signals_json` JSON NOT NULL,
    `result_json` JSON NOT NULL,
    `scoring_version` VARCHAR(64) NOT NULL,
    `created_by` VARCHAR(128) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `topic_score_runs_tenant_id_topic_candidate_id_created_at_idx`(`tenant_id`, `topic_candidate_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(36) NOT NULL,
    `tenant_id` VARCHAR(64) NOT NULL DEFAULT 'bangcat',
    `request_id` VARCHAR(128) NULL,
    `actor_type` VARCHAR(64) NOT NULL,
    `actor_id` VARCHAR(128) NULL,
    `action` VARCHAR(128) NOT NULL,
    `entity_type` VARCHAR(128) NOT NULL,
    `entity_id` VARCHAR(128) NULL,
    `metadata_json` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_tenant_id_entity_type_entity_id_created_at_idx`(`tenant_id`, `entity_type`, `entity_id`, `created_at`),
    INDEX `audit_logs_tenant_id_actor_id_created_at_idx`(`tenant_id`, `actor_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `source_cat_snapshots` ADD CONSTRAINT `source_cat_snapshots_sync_job_id_fkey` FOREIGN KEY (`sync_job_id`) REFERENCES `source_sync_jobs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cat_media_assets` ADD CONSTRAINT `cat_media_assets_cat_asset_id_fkey` FOREIGN KEY (`cat_asset_id`) REFERENCES `cat_assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pattern_source_links` ADD CONSTRAINT `pattern_source_links_pattern_id_fkey` FOREIGN KEY (`pattern_id`) REFERENCES `viral_patterns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pattern_source_links` ADD CONSTRAINT `pattern_source_links_reference_content_id_fkey` FOREIGN KEY (`reference_content_id`) REFERENCES `reference_contents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cat_content_opportunities` ADD CONSTRAINT `cat_content_opportunities_cat_asset_id_fkey` FOREIGN KEY (`cat_asset_id`) REFERENCES `cat_assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_candidates` ADD CONSTRAINT `topic_candidates_cat_asset_id_fkey` FOREIGN KEY (`cat_asset_id`) REFERENCES `cat_assets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_candidate_trends` ADD CONSTRAINT `topic_candidate_trends_topic_candidate_id_fkey` FOREIGN KEY (`topic_candidate_id`) REFERENCES `topic_candidates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_candidate_trends` ADD CONSTRAINT `topic_candidate_trends_trend_signal_id_fkey` FOREIGN KEY (`trend_signal_id`) REFERENCES `trend_signals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_candidate_patterns` ADD CONSTRAINT `topic_candidate_patterns_topic_candidate_id_fkey` FOREIGN KEY (`topic_candidate_id`) REFERENCES `topic_candidates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_candidate_patterns` ADD CONSTRAINT `topic_candidate_patterns_viral_pattern_id_fkey` FOREIGN KEY (`viral_pattern_id`) REFERENCES `viral_patterns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `topic_score_runs` ADD CONSTRAINT `topic_score_runs_topic_candidate_id_fkey` FOREIGN KEY (`topic_candidate_id`) REFERENCES `topic_candidates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

