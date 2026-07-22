import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/generated/ai-prisma/client.ts';
import {
  assertNoDrift,
  buildTestDatabaseUrl,
  dropDatabase,
  prismaFor,
  recreateDatabase,
  runPrismaMigrateDeploy,
  type MigrationTestDatabase,
} from './helpers.js';
import { T0_FIXTURE, T0_IDS } from './t0-fixture.js';

describe('initial MySQL migration: empty database', () => {
  let db: MigrationTestDatabase;
  let prisma: PrismaClient;

  beforeAll(async () => {
    db = buildTestDatabaseUrl('migration_empty');
    await recreateDatabase(db);
  }, 120_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await dropDatabase(db);
  });

  it('applies the committed migration with prisma migrate deploy', async () => {
    const output = await runPrismaMigrateDeploy(db.url);
    expect(output).toContain('000000000000_init');
    expect(output).toContain('successfully applied');
  }, 180_000);

  it('creates all 14 tables with utf8mb4 charset and tenant columns', async () => {
    prisma = prismaFor(db);
    // MySQL 8.4 exposes information_schema identifiers in the server's
    // upper-case form; normalize so the assertions hold on MySQL and MariaDB.
    const tables = (
      await prisma.$queryRawUnsafe<Array<{ table_name: string; table_collation: string }>>(
        `SELECT LOWER(table_name) AS table_name, table_collation FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'`,
      )
    ).map((row) => ({ ...row, table_collation: row.table_collation.toLowerCase() }));
    const names = tables.map((row) => row.table_name).sort();
    expect(names).toEqual(
      [
        '_prisma_migrations',
        'audit_logs',
        'cat_assets',
        'cat_content_opportunities',
        'cat_media_assets',
        'pattern_source_links',
        'reference_contents',
        'source_cat_snapshots',
        'source_sync_jobs',
        'topic_candidate_patterns',
        'topic_candidate_trends',
        'topic_candidates',
        'topic_score_runs',
        'trend_signals',
        'viral_patterns',
      ].sort(),
    );
    for (const row of tables) {
      expect(row.table_collation).toBe('utf8mb4_unicode_ci');
    }

    const tenantColumns = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = DATABASE() AND LOWER(column_name) = 'tenant_id'`,
    );
    expect(tenantColumns).toHaveLength(14);
  });

  it('creates expected unique constraints and indexes', async () => {
    const uniqueIndexes = await prisma.$queryRawUnsafe<
      Array<{ table_name: string; index_name: string; columns: string }>
    >(
      `SELECT LOWER(table_name) AS table_name, index_name,
              GROUP_CONCAT(LOWER(column_name) ORDER BY seq_in_index) AS \`columns\`
       FROM information_schema.statistics
       WHERE table_schema = DATABASE() AND non_unique = 0 AND index_name != 'PRIMARY'
       GROUP BY table_name, index_name`,
    );
    const uniqueMap = Object.fromEntries(
      uniqueIndexes.map((row) => [row.table_name, row.columns]),
    );
    expect(uniqueMap['cat_assets']).toBe('tenant_id,source_id');
    expect(uniqueMap['cat_media_assets']).toBe('tenant_id,cat_asset_id,source_media_id');
    expect(uniqueMap['reference_contents']).toBe('tenant_id,platform,url_hash');
    expect(uniqueMap['source_cat_snapshots']).toBe('tenant_id,source_id');

    const tenantFirstIndexes = await prisma.$queryRawUnsafe<
      Array<{ table_name: string; index_name: string }>
    >(
      `SELECT DISTINCT s.table_name, s.index_name
       FROM information_schema.statistics s
       WHERE s.table_schema = DATABASE() AND s.seq_in_index = 1 AND LOWER(s.column_name) = 'tenant_id'`,
    );
    // Every secondary index is tenant-scoped by design.
    expect(tenantFirstIndexes.length).toBeGreaterThanOrEqual(11);
  });

  it('has zero drift between migrated database and schema.prisma', async () => {
    await assertNoDrift(db.url);
  }, 120_000);

  it('reads and writes through Prisma Client, including Chinese text and JSON', async () => {
    const cat = await prisma.catAsset.create({
      data: {
        id: T0_IDS.cat,
        sourceId: 'cat-pocket-001',
        name: '裤兜',
        sex: '公猫',
        approximateAgeMonths: 18,
        breed: '中华田园猫',
        coatColor: '狸花白',
        adoptionStatus: '待领养',
        publicDescription: '有点胆小，但熟悉后会主动靠近人。',
        publicRescueStory: '在街边被发现后进入猫站。',
        publicPersonalityNotes: '喜欢听音乐，也喜欢追逗猫棒。',
        sourceUpdatedAt: new Date('2026-07-21T09:00:00.000Z'),
        sourceHash: T0_FIXTURE.cat.source_hash,
        isPublic: true,
        completenessScore: 80,
        createdAt: new Date('2026-07-21T10:00:31.000Z'),
        updatedAt: new Date('2026-07-21T10:00:31.000Z'),
      },
    });
    expect(cat.name).toBe('裤兜');
    expect(cat.tenantId).toBe('bangcat');

    const trend = await prisma.trendSignal.create({
      data: {
        id: T0_IDS.trend,
        signalType: 'platform-topic',
        title: '猫咪的反差萌瞬间',
        platform: 'xiaohongshu',
        signalStrength: '0.8123',
        metadata: { region: 'cn', windowDays: 30 },
        createdAt: new Date('2026-07-21T11:00:00.000Z'),
        updatedAt: new Date('2026-07-21T11:00:00.000Z'),
      },
    });
    expect(trend.metadata).toEqual({ region: 'cn', windowDays: 30 });

    const readBack = await prisma.catAsset.findUniqueOrThrow({
      where: { tenantId_sourceId: { tenantId: 'bangcat', sourceId: 'cat-pocket-001' } },
    });
    expect(readBack.publicDescription).toBe('有点胆小，但熟悉后会主动靠近人。');
  });

  it('enforces tenant-scoped uniqueness on cat_assets', async () => {
    await expect(
      prisma.catAsset.create({
        data: {
          sourceId: 'cat-pocket-001',
          name: '重复猫',
          sex: '母猫',
          adoptionStatus: '待领养',
          sourceUpdatedAt: new Date('2026-07-21T09:00:00.000Z'),
          sourceHash: 'duplicate-hash',
          updatedAt: new Date('2026-07-21T12:00:00.000Z'),
        },
      }),
    ).rejects.toThrow();

    // Same source_id under another tenant must be accepted.
    const otherTenant = await prisma.catAsset.create({
      data: {
        tenantId: 'other-tenant',
        sourceId: 'cat-pocket-001',
        name: '同名不同租户',
        sex: '母猫',
        adoptionStatus: '待领养',
        sourceUpdatedAt: new Date('2026-07-21T09:00:00.000Z'),
        sourceHash: 'other-tenant-hash',
        updatedAt: new Date('2026-07-21T12:00:00.000Z'),
      },
    });
    expect(otherTenant.tenantId).toBe('other-tenant');
  });

  it('stores DATETIME(3) millisecond precision', async () => {
    const at = new Date('2026-07-21T11:00:00.123Z');
    const created = await prisma.auditLog.create({
      data: {
        actorType: 'user',
        actorId: 'operator-1',
        action: 'migration.precision.check',
        entityType: 'migration',
        metadata: { check: '毫秒精度' },
        createdAt: at,
      },
    });
    const rows = await prisma.$queryRawUnsafe<Array<{ created_at: string }>>(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s.%f') AS created_at
       FROM audit_logs WHERE id = '${created.id}'`,
    );
    expect(rows[0]?.created_at.endsWith('.123000')).toBe(true);
  });
});
