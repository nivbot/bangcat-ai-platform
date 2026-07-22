-- Source-side SQL for the AI platform read-only connector (Issue #5).
--
-- This file is executed by a database administrator against the EXISTING
-- business MySQL instance during deployment. It is not a Prisma migration and
-- is never run by the application. Rollback is at the bottom.
--
-- In production the ai_public_* objects are VIEWs over approved legacy
-- tables; in local/test environments they are plain fixture tables with the
-- identical column contract (see prisma/source/schema.prisma). The
-- application only ever reads them through the SELECT-only account created
-- below, so the underlying object type is invisible to it.
--
-- Privacy contract: these views/tables must expose ONLY the approved public
-- fields listed here. Phone, WeChat, identity numbers, adoption
-- applications, payment data and internal rescuer notes must never be
-- selectable through any ai_public_* object.

CREATE USER IF NOT EXISTS 'bangcat_ai_source_reader'@'%'
  IDENTIFIED BY 'change-me-to-a-strong-random-password';

-- SELECT on the approved public views only. No INSERT/UPDATE/DELETE/DDL.
GRANT SELECT ON catnote_prod.ai_public_cats TO 'bangcat_ai_source_reader'@'%';
GRANT SELECT ON catnote_prod.ai_public_cat_events TO 'bangcat_ai_source_reader'@'%';
GRANT SELECT ON catnote_prod.ai_public_media TO 'bangcat_ai_source_reader'@'%';
GRANT SELECT ON catnote_prod.ai_public_stations TO 'bangcat_ai_source_reader'@'%';
FLUSH PRIVILEGES;

-- Production view definitions (adjust the base table/column names to the
-- real catnoteapi_v2 schema during deployment review):
--
-- CREATE OR REPLACE VIEW catnote_prod.ai_public_cats AS
-- SELECT
--   c.id                AS source_id,
--   c.public_name       AS name,
--   c.sex               AS sex,
--   c.approximate_age   AS age,
--   c.cover_image_url   AS image,
--   c.public_media      AS media_json,
--   c.adoption_status   AS adoption_status,
--   c.public_description       AS public_description,
--   c.public_rescue_story      AS public_rescue_story,
--   c.public_personality_notes AS public_personality_notes,
--   c.station_id        AS station_id,
--   c.updated_at        AS source_updated_at
-- FROM cats c
-- WHERE c.is_public = 1;
--
-- CREATE OR REPLACE VIEW catnote_prod.ai_public_cat_events AS
-- SELECT e.id AS source_id, e.cat_id AS cat_source_id, e.event_type,
--        e.public_summary, e.public_media AS media_json,
--        e.occurred_at, e.updated_at AS source_updated_at
-- FROM cat_events e
-- WHERE e.is_public = 1;
--
-- CREATE OR REPLACE VIEW catnote_prod.ai_public_media AS
-- SELECT m.id AS source_id, m.cat_id AS cat_source_id, m.url AS source_url,
--        m.kind, m.usage_scope, m.alt_text, m.updated_at AS source_updated_at
-- FROM cat_media m
-- WHERE m.usage_scope IN ('official_channels', 'partner_creators', 'public_mcp');
--
-- CREATE OR REPLACE VIEW catnote_prod.ai_public_stations AS
-- SELECT s.id AS source_id, s.name, s.region, s.status,
--        s.updated_at AS source_updated_at
-- FROM stations s
-- WHERE s.status = 'active';

-- Verification (must succeed for SELECT and fail for writes):
--   mysql -u bangcat_ai_source_reader -p -e "SELECT COUNT(*) FROM catnote_prod.ai_public_cats"
--   mysql -u bangcat_ai_source_reader -p -e "INSERT INTO catnote_prod.ai_public_cats (...) VALUES (...)"
--   -- expected: ERROR 1142 INSERT command denied
--
-- Rollback:
--   DROP USER IF EXISTS 'bangcat_ai_source_reader'@'%';
--   DROP VIEW IF EXISTS catnote_prod.ai_public_cats,
--     catnote_prod.ai_public_cat_events,
--     catnote_prod.ai_public_media,
--     catnote_prod.ai_public_stations;
