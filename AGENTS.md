# Bangcat AI Agent Contract

This file is the mandatory entrypoint for every coding, review, testing, migration, documentation, or release agent working in this repository.

## 1. Read before changing code

Read, in order:

1. `README.md`
2. `docs/project/PROJECT_STATUS.md`
3. `docs/project/ROADMAP.md`
4. `docs/architecture/TECH_STACK.md`
5. relevant ADRs under `docs/architecture/`
6. the GitHub Issue or work item assigned to the task

Do not implement work that has no issue, explicit scope, acceptance criteria, and rollback note.

## 2. Fixed architecture boundaries

- Runtime: Node.js 24 LTS and TypeScript.
- API: NestJS with Fastify.
- AI data: Prisma and `catnote_ai_*` MySQL databases.
- Existing business data: approved `ai_public_*` views through a SELECT-only connection.
- Long-running work: BullMQ workers, never synchronous API handlers.
- Media: Tencent COS through the storage port.
- Deployment: Docker Compose; API and Worker remain separate processes.
- The AI platform must never write to `catnote_prod`.
- Browsers and mini-programs must not call the AI service directly.

Changing any item above requires an ADR and explicit project-lead approval.

## 3. Branch and task rules

- Never commit directly to `main`.
- One issue maps to one short-lived branch and one PR.
- Branch names: `feat/<issue>-<slug>`, `fix/<issue>-<slug>`, `chore/<issue>-<slug>`, `docs/<issue>-<slug>`.
- Keep changes scoped. Unrelated cleanup belongs in another issue.
- Rebase or update from `main` before final review.
- Delete the branch after merge.

## 4. Required implementation evidence

Every PR must include:

- problem and user value;
- scope and explicit non-goals;
- files/modules changed;
- tests added or updated;
- commands and results;
- database and privacy impact;
- deployment and rollback notes;
- screenshots or API examples when behavior changes.

Claims such as “tested” or “safe” require reproducible evidence.

## 5. Author and reviewer separation

The implementation agent must not be the sole approval authority for its own work.

Review must be performed from a fresh context by a separate review agent or human reviewer. Reviewers check correctness, architecture, security/privacy, data migration safety, tests, operational failure modes, and repository hygiene.

The project lead merges only after review findings are resolved and required CI checks pass.

## 6. Database safety

- Production schema changes require a committed migration reviewed as SQL.
- Test migrations on an empty AI database and an upgraded `catnote_ai_test` database.
- Never run automatic production schema mutation at application startup.
- Never create cross-database foreign keys.
- Never expose or copy unapproved personal data from the legacy platform.
- Every destructive migration needs backup, rollback, and verification steps.

## 7. Code quality

- Preserve strict TypeScript types; do not use `any` to bypass design problems.
- Validate external input at the boundary.
- Keep domain rules independent of infrastructure.
- API handlers enqueue long-running work and return task identifiers.
- Add structured logs and correlation identifiers to asynchronous flows.
- Do not commit secrets, generated output, local databases, build artifacts, or temporary diagnostics.
- Avoid adding dependencies when the platform already provides the capability.

## 8. Definition of done

A task is done only when:

- acceptance criteria pass;
- typecheck, tests, build, Prisma validation, and policy checks pass;
- documentation and status records are updated;
- review findings are resolved;
- rollback is viable;
- the PR is merged and its branch is removed.

## 9. Handoff

Use `docs/project/HANDOFF_TEMPLATE.md`. A handoff must state completed work, remaining work, decisions, risks, commands run, test results, and the exact next action. Never rely on hidden conversation context as the project record.
