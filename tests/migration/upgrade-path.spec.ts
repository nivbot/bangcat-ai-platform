import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '../../src/generated/ai-prisma/client.ts';
import {
  applyBaselineWithPrefix,
  assertNoDrift,
  buildTestDatabaseUrl,
  countRows,
  dropDatabase,
  insertStatement,
  listTables,
  prismaFor,
  recreateDatabase,
  runPrismaMigrateDeploy,
  type MigrationTestDatabase,
} from './helpers.js';
import { T0_IDS, T0_TABLE_ORDER } from './t0-fixture.js';

describe('initial MySQL migration: upgrade path on a pre-existing database', () => {
  const BASELINE_PREFIX = 'b_';
  let db: MigrationTestDatabase;
  let prisma: PrismaClient;
  let cleanupBaseline: () => Promise<void>;
  let baselineTables: Awaited<ReturnType<typeof applyBaselineWithPrefix>>['tables'];

  beforeAll(async () => {
    db = buildTestDatabaseUrl('migration_upgrade');
    await recreateDatabase(db);

    // Simulate a database that already ran an earlier revision of the schema:
    // same shape as the committed migration, different table names, holding
    // representative T0 data written through raw SQL.
    const baseline = await applyBaselineWithPrefix(db.url, BASELINE_PREFIX);
    baselineTables = baseline.tables;
    cleanupBaseline = baseline.cleanup;
    prisma = prismaFor(db);

    for (const [table, rows] of T0_TABLE_ORDER) {
      const baselineTable = baselineTables.find((entry) => entry.name === `${BASELINE_PREFIX}${table}`);
      if (!baselineTable) throw new Error(`baseline table missing: ${BASELINE_PREFIX}${table}`);
      for (const row of rows) {
        const statement = insertStatement(baselineTable, row);
        await prisma.$executeRawUnsafe(statement);
      }
    }
  }, 240_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await cleanupBaseline?.();
    await dropDatabase(db);
  });

  it('seeds representative T0 data into the pre-existing tables', async () => {
    const tables = await listTables(prisma);
    expect(tables).toHaveLength(19);
    expect(tables.every((name) => name.startsWith(BASELINE_PREFIX))).toBe(true);

    const [{ count } = { count: 0n }] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) AS count FROM \`${BASELINE_PREFIX}cat_assets\``,
    );
    expect(Number(count)).toBe(1);
  });

  it('applies the committed migration without touching pre-existing data', async () => {
    const output = await runPrismaMigrateDeploy(db.url);
    expect(output).toContain('successfully applied');

    const tables = await listTables(prisma);
    expect(tables).toHaveLength(38);
    expect(tables.filter((name) => name.startsWith(BASELINE_PREFIX))).toHaveLength(19);
    expect(tables.filter((name) => !name.startsWith(BASELINE_PREFIX))).toContain('cat_assets');

    // No record loss in the pre-existing tables.
    for (const [table, rows] of T0_TABLE_ORDER) {
      expect(await countRows(prisma, `${BASELINE_PREFIX}${table}`), `${BASELINE_PREFIX}${table}`).toBe(rows.length);
    }

    // Chinese content and JSON survive the upgrade untouched.
    const [cat] = await prisma.$queryRawUnsafe<Array<{ name: string; public_description: string }>>(
      `SELECT name, public_description FROM \`${BASELINE_PREFIX}cat_assets\` WHERE id = '${T0_IDS.cat}'`,
    );
    expect(cat?.name).toBe('裤兜');
    expect(cat?.public_description).toBe('有点胆小，但熟悉后会主动靠近人。');
  }, 180_000);

  it('is idempotent: a second deploy applies no pending migrations', async () => {
    const output = await runPrismaMigrateDeploy(db.url);
    expect(output).toMatch(/already in sync|No pending migrations/i);
    expect(output).not.toContain('Applying migration');
  }, 180_000);

  it('has zero drift between upgraded database and schema.prisma', async () => {
    // Compare only the real tables: restrict the drift check to a database
    // holding just the migrated schema. The baseline-prefixed tables are
    // intentionally extra objects, so diff against them would be non-empty.
    const [row] = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) AS count FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
       AND table_name NOT LIKE '${BASELINE_PREFIX}%' AND table_name != '_prisma_migrations'`,
    );
    expect(Number(row?.count ?? 0)).toBe(19);

    const cleanDb = buildTestDatabaseUrl('migration_upgrade_clean');
    await recreateDatabase(cleanDb);
    try {
      await runPrismaMigrateDeploy(cleanDb.url);
      await assertNoDrift(cleanDb.url);
    } finally {
      await dropDatabase(cleanDb);
    }
  }, 240_000);

  it('new tables accept Prisma Client writes next to pre-existing data', async () => {
    const cat = await prisma.catAsset.create({
      data: {
        sourceId: 'cat-after-upgrade-001',
        name: '升级后写入的猫',
        sex: '公猫',
        adoptionStatus: '已领养',
        sourceUpdatedAt: new Date('2026-07-22T09:00:00.000Z'),
        sourceHash: 'post-upgrade-hash',
        updatedAt: new Date('2026-07-22T09:00:00.000Z'),
      },
    });
    expect(cat.id).toBeTruthy();

    expect(await countRows(prisma, `${BASELINE_PREFIX}cat_assets`)).toBe(1);
  });
});
