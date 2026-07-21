import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'AGENTS.md',
  'CONTRIBUTING.md',
  'docs/project/OPERATING_MODEL.md',
  'docs/project/PROJECT_STATUS.md',
  'docs/project/ROADMAP.md',
  'docs/project/REVIEW_AND_MERGE.md',
  'docs/architecture/TECH_STACK.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/CODEOWNERS',
];

const obsoletePaths = new Set([
  'src/index.ts',
  'src/http/server.ts',
  'src/http/topic-routes.ts',
  'src/storage/sqlite-database.ts',
  'src/storage/cat-asset-repository.ts',
  'src/storage/topic-engine-repository.ts',
  'src/application/sync-cats.ts',
  'src/domain/topic-engine-records.ts',
  'db/migrations/001_initial.sql',
  'db/migrations/002_topic_engine_t0.sql',
]);

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((value) => value.trim())
  .filter(Boolean);

const errors = [];

for (const file of requiredFiles) {
  if (!existsSync(file)) errors.push(`required project file is missing: ${file}`);
}

for (const file of trackedFiles) {
  if (obsoletePaths.has(file)) errors.push(`obsolete Bootstrap implementation is tracked: ${file}`);
  if (file === '.env' || file.endsWith('/.env')) errors.push(`secret environment file is tracked: ${file}`);
  if (/\.(sqlite|sqlite-shm|sqlite-wal|zip)$/i.test(file)) errors.push(`local/generated binary is tracked: ${file}`);
  if (/^(dist|coverage|data|logs)\//.test(file)) errors.push(`generated runtime directory is tracked: ${file}`);
  if (/(^|\/)(typecheck\.log|npm-debug\.log|yarn-error\.log)$/.test(file)) errors.push(`temporary diagnostic is tracked: ${file}`);
  if (file.endsWith('.test.ts')) errors.push(`legacy node:test naming is not allowed; use Vitest *.spec.ts: ${file}`);
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
if (!packageJson.scripts?.typecheck || !packageJson.scripts?.test || !packageJson.scripts?.build) {
  errors.push('package.json must expose typecheck, test and build scripts');
}

const techStack = readFileSync('docs/architecture/TECH_STACK.md', 'utf8');
for (const requiredTerm of ['Node.js 24', 'NestJS', 'Fastify', 'Prisma', 'MySQL', 'BullMQ', 'Redis']) {
  if (!techStack.includes(requiredTerm)) errors.push(`TECH_STACK.md is missing approved term: ${requiredTerm}`);
}

if (errors.length > 0) {
  console.error('Repository policy check failed:\n');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Repository policy check passed for ${trackedFiles.length} tracked files.`);
