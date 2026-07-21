# System Context

## Status

- Decision date: 2026-07-21
- Repository role: independent AI content asset service
- Current implementation: Phase 0 complete, Phase 1 foundation started

## System boundary

```text
Existing mini-program production system
        |
        | future: approved read-only connector + field allowlist
        v
Bangcat sync boundary
  - whitelist mapping
  - privacy redaction
  - idempotency hash
        |
        v
Independent AI asset database
        |
        +--> HTTP API / future admin UI
        +--> future content generation workers
        +--> future internal MCP service
```

The AI service does not possess production write credentials and has no reverse write path to the mini-program database.

## Chosen bootstrap stack

Because this repository contained only documentation and no confirmed existing stack, the first runnable vertical slice uses:

- Node.js 22+
- TypeScript executed with Node type stripping
- Node built-in HTTP server
- SQLite via `node:sqlite` for local and MVP isolation
- Repository abstraction so PostgreSQL can replace SQLite without changing domain logic
- Node built-in test runner

This choice minimizes dependencies and lets the safety boundary and synchronization rules run immediately. It is not a final commitment for high-concurrency production deployment.

## Services in this repository

- `src/domain`: public AI asset types, allowlist mapping, privacy redaction and hashing
- `src/application`: synchronization use cases
- `src/storage`: independent database and repositories
- `src/http`: internal HTTP API
- `db/migrations`: versioned AI database schema

## Current API

- `GET /health`
- `GET /v1/cats`
- `GET /v1/cats/:id`
- `POST /v1/sync/preview` — sanitize one record without writing it
- `POST /v1/sync/fixture` — write an array of test records into the AI database

Write endpoints support `x-admin-api-key` when `ADMIN_API_KEY` is configured.

## Environment separation

- Development: local SQLite file under `data/`; synthetic fixtures only
- Test: in-memory SQLite; synthetic fixtures only
- Staging: separate database and object-storage namespace; approved anonymized records
- Production: separate AI database, separate secrets and a network-restricted read-only source connector

Never reuse a production mini-program credential in the AI application runtime.

## TODO before real source synchronization

- Confirm current production database engine and version.
- Confirm the source tables for cats, posts, comments, adoption status and media.
- Approve a field allowlist and examples from each source table.
- Create a database user that has `SELECT` only on approved views.
- Confirm object storage and signed-URL behavior.
- Confirm existing administrator authentication that the future UI should reuse.
- Decide whether production AI storage remains SQLite for a single-node pilot or moves to PostgreSQL.
- Select the first text model provider and monthly budget.
