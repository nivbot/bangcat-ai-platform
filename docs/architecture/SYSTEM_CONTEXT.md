# System Context

## Status

- Initial boundary decision: 2026-07-21
- Production stack decision: 2026-07-22
- Repository role: independent AI content asset, topic and generation platform
- Current implementation: Topic Engine T0 migrated to the production architecture foundation

## System boundary

```text
catnote_client / catnote_admin / superweb
                    │
                    ▼
             catnoteapi_v2
      JWT auth, roles and business proxy
                    │
                    │ internal service token
                    ▼
              bangcat-ai-api
             NestJS + Fastify
                    │
       ┌────────────┼─────────────┐
       ▼            ▼             ▼
catnote_ai_*    Redis/BullMQ   Tencent COS
 MySQL RW           │          generated media
                    ▼
             bangcat-ai-worker

catnote_prod / catnote_test
          │
          │ SELECT-only approved Views
          ▼
 source Prisma client inside AI platform
```

The AI platform has no write path to the existing business database. Browsers and mini-programs do not call the AI API directly.

## Production stack

- Node.js 24 LTS;
- TypeScript;
- NestJS 11 with Fastify 5;
- Prisma ORM 7;
- MySQL 8.4 LTS;
- Redis 7.4 and BullMQ 5;
- Tencent COS;
- OpenTelemetry;
- Vitest;
- Docker Compose and GitHub Actions.

See [TECH_STACK.md](TECH_STACK.md) and [ADR-0003](ADR-0003-production-platform-stack.md).

## Runtime processes

### `bangcat-ai-api`

- accepts internal HTTP requests;
- validates service token, tenant and DTOs;
- persists Topic Engine state;
- creates BullMQ jobs;
- does not load queue processors.

### `bangcat-ai-worker`

- consumes BullMQ jobs;
- performs model and media work;
- records attempts, outputs and failures;
- does not expose an HTTP port.

## Database connections

### AI connection

- database: `catnote_ai_prod` / `catnote_ai_test`;
- permission: application read/write;
- contains AI assets, topic data, jobs, audit and future generation metadata.

### Source connection

- database: `catnote_prod` / `catnote_test`;
- permission: SELECT only;
- visible objects: approved `ai_public_*` Views only;
- does not expose user, application, payment or identity data.

## Authentication

The existing platform validates the user's JWT and role. It then calls the AI service with:

```text
x-service-token
x-tenant-id
x-actor-id
x-actor-type
x-request-id
```

The AI service records tenant, actor and request ID in audit logs.

## Environment separation

- Development: `catnote_ai_dev`, local Redis, optional source DB and COS;
- Test: `catnote_ai_test`, test Redis, approved anonymized source Views;
- Production: `catnote_ai_prod`, production Redis/COS namespaces, network-restricted source reader;
- Secrets and database accounts are different in every environment.

## Remaining integration work

- create and review `ai_public_*` Views in the existing platform database;
- create the SELECT-only source account;
- add the AI proxy module to `catnoteapi_v2`;
- generate and review the first MySQL Migration;
- configure production Redis, COS and OpenTelemetry endpoint;
- run end-to-end Topic Engine T0 validation with real anonymized cats;
- implement Topic Engine T1 model-assisted reference analysis.
