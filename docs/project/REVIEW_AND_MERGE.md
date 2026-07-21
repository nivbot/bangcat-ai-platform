# Review and Merge Gates

## Independent review requirement

Every code PR requires review from a person or AI context that did not author the implementation. Documentation-only typo fixes may be reviewed by the project lead, but architecture, schema, security, queue, storage, and deployment changes always require independent technical review.

## Review checklist

### Scope and behavior

- Does the implementation satisfy the linked Issue and acceptance criteria?
- Are non-goals respected?
- Are edge cases and failure states handled?
- Is behavior backward compatible where required?

### Architecture

- Does it comply with `docs/architecture/TECH_STACK.md` and accepted ADRs?
- Are API and Worker responsibilities separated?
- Is domain logic independent of infrastructure?
- Is new complexity justified?

### Data and privacy

- Can the AI service write only to `catnote_ai_*`?
- Is old-platform access limited to approved Views and fields?
- Are tenant boundaries enforced in every query and write?
- Are personal data, secrets and media permissions handled correctly?
- Are migrations explicit, reviewed, reversible and tested?

### Reliability

- Are retries idempotent?
- Can jobs resume after process or Redis interruption?
- Are timeouts, cancellation and partial failure considered?
- Are logs correlated by request/job/generation ID?
- Will missing optional infrastructure fail visibly rather than lose data?

### Tests and evidence

- Do tests prove the changed behavior rather than only execute code?
- Are negative and authorization cases covered?
- Do typecheck, Prisma validation, tests, build and policy checks pass?
- Are claims supported by exact commands, CI runs or screenshots?

### Repository hygiene

- Is the diff focused?
- Are obsolete files removed or explicitly marked historical?
- Are generated files, secrets, temporary logs and local data excluded?
- Are docs, status and ADRs updated where required?

## Severity and resolution

- **Blocker**: must be fixed before merge. Includes security/privacy breach, data loss, cross-tenant access, production outage risk, unsafe migration, or broken architecture boundary.
- **Major**: must be fixed before merge. Includes incorrect behavior, missing validation, important test gap, or unreliable error handling.
- **Minor**: should be fixed or explicitly accepted with rationale.
- **Note**: optional improvement or follow-up.

## Merge gate

The project lead may merge only when:

1. linked Issue is complete;
2. independent review has no unresolved Blocker or Major finding;
3. CI is green on the current head commit;
4. branch is current with `main`;
5. database/privacy/deployment impacts are documented;
6. rollback is credible;
7. project status or roadmap is updated if the current state changed.

Normal PRs use squash merge. After merge, verify `main` CI and delete the source branch.
