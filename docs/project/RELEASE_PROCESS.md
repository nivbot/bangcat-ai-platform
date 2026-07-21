# Release Process

## Release principles

- `main` must remain releasable.
- Production deploys use reviewed commits from `main`, never feature branches.
- Database migrations are explicit release artifacts and never run implicitly at application startup.
- API and Worker can be deployed and rolled back independently when schemas and task protocols remain compatible.

## Before merge

- linked Issue acceptance criteria complete;
- independent review complete;
- CI green on current head;
- migration SQL reviewed and tested where applicable;
- deployment, health checks and rollback documented;
- backward compatibility and in-flight job behavior understood.

## Before production deployment

1. Record release commit SHA.
2. Back up affected AI databases and verify backup readability.
3. Confirm source database account remains SELECT-only.
4. Confirm Redis, COS and service secrets target the correct environment.
5. Apply reviewed migrations using the deployment command.
6. Start or update API and Worker containers.
7. Run health checks and a synthetic job.
8. Verify logs/traces, database writes, queue processing and COS output.
9. Record deployment evidence and rollback point.

## Rollback

- stop new job intake when data compatibility is uncertain;
- roll back API/Worker images to the recorded previous SHA;
- use forward-fix migrations by default; destructive database rollback requires explicit reviewed SQL and restored backups;
- verify queued and in-flight jobs before resuming workers;
- document incident cause, impact and prevention follow-up.

## Post-release

- verify main CI;
- confirm no branch-specific deployment remains;
- update `PROJECT_STATUS.md` and relevant Issues;
- remove merged branches;
- create follow-up Issues for accepted residual risks.
