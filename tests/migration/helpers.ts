import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../src/generated/ai-prisma/client.ts';

const execFileAsync = promisify(execFile);
const TEST_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(TEST_ROOT, '..', '..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'prisma', 'ai', 'migrations');
const SCHEMA_PATH = path.join(REPO_ROOT, 'prisma', 'ai', 'schema.prisma');
const CONFIG_PATH = path.join(REPO_ROOT, 'prisma.config.ts');

export interface MigrationTestDatabase {
  url: string;
  name: string;
  host: string;
  port: number;
  user: string;
  password: string;
}

export function buildTestDatabaseUrl(suffix: string): MigrationTestDatabase {
  const base = process.env.AI_DATABASE_URL;
  if (!base) {
    throw new Error('AI_DATABASE_URL is required for migration integration tests');
  }
  const parsed = new URL(base);
  const baseName = parsed.pathname.replace(/^\//, '');
  if (!baseName) {
    throw new Error('AI_DATABASE_URL must include a database name');
  }
  const name = `${baseName}_${suffix}`.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 60);
  parsed.pathname = `/${name}`;
  return {
    url: parsed.toString(),
    name,
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
  };
}

export function prismaFor(db: MigrationTestDatabase): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      database: db.name,
      connectionLimit: 2,
    }),
  });
}

export async function recreateDatabase(db: MigrationTestDatabase): Promise<void> {
  const admin = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      connectionLimit: 1,
    }),
  });
  try {
    await admin.$executeRawUnsafe(
      `DROP DATABASE IF EXISTS \`${db.name}\``,
    );
    await admin.$executeRawUnsafe(
      `CREATE DATABASE \`${db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await admin.$disconnect();
  }
}

export async function dropDatabase(db: MigrationTestDatabase): Promise<void> {
  const admin = new PrismaClient({
    adapter: new PrismaMariaDb({
      host: db.host,
      port: db.port,
      user: db.user,
      password: db.password,
      connectionLimit: 1,
    }),
  });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${db.name}\``);
  } finally {
    await admin.$disconnect();
  }
}

const NPX = 'npx';
// Windows cannot exec .cmd shims without a shell (spawn EINVAL).
const SHELL = process.platform === 'win32';

export async function runPrismaMigrateDeploy(url: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync(
    NPX,
    ['prisma', 'migrate', 'deploy', '--config', CONFIG_PATH],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, AI_DATABASE_URL: url },
      maxBuffer: 16 * 1024 * 1024,
      shell: SHELL,
    },
  );
  return `${stdout}\n${stderr}`;
}

export async function runMigrateDiff(args: string[], url: string): Promise<{ output: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync(
      NPX,
      ['prisma', 'migrate', 'diff', '--config', CONFIG_PATH, ...args],
      {
        cwd: REPO_ROOT,
        env: { ...process.env, AI_DATABASE_URL: url },
        maxBuffer: 16 * 1024 * 1024,
        shell: SHELL,
      },
    );
    return { output: `${stdout}\n${stderr}`, exitCode: 0 };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      output: `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`,
      exitCode: failure.code ?? 1,
    };
  }
}

export async function assertNoDrift(url: string): Promise<string> {
  const result = await runMigrateDiff(
    ['--from-config-datasource', '--to-schema', SCHEMA_PATH, '--script', '--exit-code'],
    url,
  );
  if (result.exitCode !== 0) {
    throw new Error(`schema drift detected after migration:\n${result.output}`);
  }
  return result.output;
}

export interface BaselineTable {
  name: string;
  columns: string[];
}

function sqlString(value: string | null): string {
  if (value === null) return 'NULL';
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

export function insertStatement(table: BaselineTable, row: Record<string, string | null>): string {
  const columns = table.columns.filter((column) => column in row);
  const values = columns.map((column) => sqlString(row[column] ?? null));
  return `INSERT INTO \`${table.name}\` (${columns.map((column) => `\`${column}\``).join(', ')}) VALUES (${values.join(', ')});`;
}
export async function applyBaselineWithPrefix(
  url: string,
  prefix: string,
): Promise<{ dir: string; tables: BaselineTable[]; cleanup: () => Promise<void> }> {
  // Keep the scratch dir inside the repo so the generated prisma.config.ts
  // can resolve the 'prisma/config' module from node_modules.
  const dir = await mkdtemp(path.join(REPO_ROOT, 'node_modules', '.cache', 'bangcat-baseline-'));
  const baselineDir = path.join(dir, 'migrations', '000000000000_baseline');
  await mkdir(baselineDir, { recursive: true });

  const { readFile, readdir } = await import('node:fs/promises');
  const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true });
  const migrationDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (migrationDirs.length !== 1) {
    throw new Error(
      `baseline simulation expects exactly one committed migration, found: ${migrationDirs.join(', ')}`,
    );
  }

  const migrationDir = migrationDirs[0];
  if (!migrationDir) {
    throw new Error('baseline simulation found no committed migration');
  }
  const sql = await readFile(path.join(MIGRATIONS_DIR, migrationDir, 'migration.sql'), 'utf8');
  const rewritten = sql
    .replace(/CREATE TABLE `([^`]+)`/g, (_match, table: string) => `CREATE TABLE \`${prefix}${table}\``)
    .replace(/ALTER TABLE `([^`]+)`/g, (_match, table: string) => `ALTER TABLE \`${prefix}${table}\``)
    .replace(/REFERENCES `([^`]+)`/g, (_match, table: string) => `REFERENCES \`${prefix}${table}\``)
    .replace(/INDEX `([^`]+)`/g, (_match, name: string) => `INDEX \`${prefix}${name}\``)
    .replace(/UNIQUE INDEX `([^`]+)`/g, (_match, name: string) => `UNIQUE INDEX \`${prefix}${name}\``)
    .replace(/ADD CONSTRAINT `([^`]+)`/g, (_match, name: string) => `ADD CONSTRAINT \`${prefix}${name}\``);

  await writeFile(path.join(baselineDir, 'migration.sql'), rewritten, 'utf8');
  await writeFile(
    path.join(dir, 'migrations', 'migration_lock.toml'),
    '# Please do not edit this file manually\nprovider = "mysql"\n',
    'utf8',
  );

  const baselineConfig = path.join(dir, 'prisma.config.ts');
  await writeFile(
    baselineConfig,
    [
      `import { defineConfig, env } from 'prisma/config';`,
      `export default defineConfig({`,
      `  schema: ${JSON.stringify(SCHEMA_PATH)},`,
      `  migrations: { path: ${JSON.stringify(path.join(dir, 'migrations'))} },`,
      `  datasource: { url: env('AI_DATABASE_URL') },`,
      `});`,
      ``,
    ].join('\n'),
    'utf8',
  );

  await execFileAsync(
    NPX,
    ['prisma', 'migrate', 'deploy', '--config', baselineConfig],
    {
      cwd: REPO_ROOT,
      env: { ...process.env, AI_DATABASE_URL: url },
      maxBuffer: 16 * 1024 * 1024,
      shell: SHELL,
    },
  );

  const tables: BaselineTable[] = [...rewritten.matchAll(/CREATE TABLE `([^`]+)` \(([^]*?)\n\) DEFAULT/g)].map(
    (match) => ({
      name: match[1] ?? '',
      columns: [...(match[2] ?? '').matchAll(/^    `([^`]+)`/gm)].map((column) => column[1] ?? ''),
    }),
  );

  return {
    dir,
    tables,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function uuid(): string {
  return randomUUID();
}

/** Returns the list of user tables (excluding _prisma_migrations) in a database. */
export async function listTables(prisma: PrismaClient): Promise<string[]> {
  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' ORDER BY table_name`,
  );
  return rows.map((row) => row.table_name).filter((name) => name !== '_prisma_migrations');
}

export async function countRows(prisma: PrismaClient, table: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    `SELECT COUNT(*) AS count FROM \`${table}\``,
  );
  const row = rows[0];
  if (!row) throw new Error(`COUNT(*) returned no row for ${table}`);
  return Number(row.count);
}
