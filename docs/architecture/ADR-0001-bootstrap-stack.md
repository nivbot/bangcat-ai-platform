# ADR-0001: Zero-dependency bootstrap stack

- Status: Superseded by ADR-0003
- Date: 2026-07-21
- Superseded date: 2026-07-22

## Context

The repository had product documents but no code and no verified production technology stack. Development needed to begin without guessing production tables or introducing a route that could write to the live mini-program database.

## Decision

Build the first vertical slice with Node.js 22, TypeScript type stripping, built-in HTTP, built-in tests and an independent SQLite database behind a repository abstraction.

This decision was intentionally limited to Bootstrap and is retained as historical context. The production baseline is now defined by [ADR-0003](ADR-0003-production-platform-stack.md).

## Consequences

Positive:

- The service ran without third-party packages.
- Privacy mapping and idempotency could be tested immediately.
- AI data was physically separated from production data.
- Domain rules were established before choosing production infrastructure.

Trade-offs:

- `node:sqlite` was experimental in Node 22.
- The built-in HTTP layer was intentionally minimal.
- SQLite was not suitable for multi-instance production deployment.
- Long-running AI and media tasks required a durable asynchronous queue.

## Resolution

After inspecting the existing `AIcoding` production platform and confirming the MySQL, Docker, JWT and deployment environment, the project adopted Node.js 24, NestJS/Fastify, Prisma/MySQL, Redis/BullMQ, COS and OpenTelemetry in ADR-0003.
