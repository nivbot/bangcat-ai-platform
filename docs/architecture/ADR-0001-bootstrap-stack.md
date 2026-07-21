# ADR-0001: Zero-dependency bootstrap stack

- Status: Accepted for bootstrap
- Date: 2026-07-21

## Context

The repository had product documents but no code and no verified production technology stack. Development needed to begin without guessing production tables or introducing a route that could write to the live mini-program database.

## Decision

Build the first vertical slice with Node.js 22, TypeScript type stripping, built-in HTTP, built-in tests and an independent SQLite database behind a repository abstraction.

## Consequences

Positive:

- The service runs without third-party packages.
- Privacy mapping and idempotency can be tested immediately.
- AI data is physically separated from production data.
- A PostgreSQL repository can be added later without rewriting domain rules.

Trade-offs:

- `node:sqlite` is experimental in Node 22.
- The built-in HTTP layer is intentionally minimal.
- SQLite is not yet approved for multi-instance production deployment.

## Follow-up trigger

Revisit the storage and web framework decision before staging deployment, after the existing backend stack, concurrency needs and deployment environment are confirmed.
