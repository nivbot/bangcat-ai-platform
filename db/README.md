# Legacy Bootstrap migrations

The SQL files in this directory belong to the superseded SQLite Bootstrap implementation from ADR-0001.

They are retained temporarily for migration review and historical comparison, but they are **not** executed by the Node.js 24 / NestJS production application.

The production database contract is defined in:

- `prisma/ai/schema.prisma` for the read/write AI MySQL database;
- `prisma/source/schema.prisma` for SELECT-only views in the existing business MySQL database;
- reviewed migrations under `prisma/ai/migrations/` once the initial MySQL migration is generated.

Do not deploy the SQLite migrations to MySQL and do not point the production application at a SQLite file.
