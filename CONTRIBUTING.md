# Contributing to Bangcat AI Platform

All work follows an issue → branch → pull request → independent review → merge workflow.

## Starting work

1. Confirm the task exists as a GitHub Issue with scope, acceptance criteria, risks, dependencies, and rollback expectations.
2. Read `AGENTS.md` and the project status/architecture documents.
3. Create a short-lived branch from the latest `main`.
4. Add or update tests before declaring the implementation complete.

## Pull requests

Use `.github/PULL_REQUEST_TEMPLATE.md`. Keep the PR focused and small enough to review. Draft PRs are encouraged during implementation, but only ready PRs with complete evidence may be merged.

Required checks:

```bash
npm run typecheck
npm test
npm run build
npx prisma validate --schema prisma/ai/schema.prisma
npx prisma validate --schema prisma/source/schema.prisma
npm run policy:check
```

Database changes additionally require reviewed SQL, empty-database validation, upgrade validation, backup and rollback steps.

## Review

A separate reviewer must assess the change. The reviewer should not merely restate the author’s summary; they must inspect the diff, failure modes, tests, architecture boundaries, privacy impact, and operational behavior.

Severity:

- **Blocker**: data loss, security/privacy breach, production outage risk, broken architecture boundary, or untested migration.
- **Major**: incorrect behavior, missing validation, significant test gap, or unreliable failure handling.
- **Minor**: maintainability, clarity, or low-risk quality issue.

Blocker and Major findings must be resolved before merge.

## Merge policy

- `main` is always releasable.
- Use squash merge for normal feature/fix PRs.
- Use merge commits only when preserving intentional stacked history.
- Never bypass failing required checks.
- Delete merged branches.
- Update `docs/project/PROJECT_STATUS.md` when the repository’s current state or next priorities change.
