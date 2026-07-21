import type { UntrustedSourceCat } from "../domain/cat-asset.ts";
import { sha256Of } from "../domain/hash.ts";
import { sanitizeSourceCat } from "../domain/sanitize-source-cat.ts";
import { CatAssetRepository } from "../storage/cat-asset-repository.ts";

export interface SyncSummary {
  jobId: string;
  read: number;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: number;
  errorMessages: string[];
}

export function syncCats(
  repository: CatAssetRepository,
  records: UntrustedSourceCat[],
  mode: "full" | "incremental" | "single" | "fixture" = "fixture",
): SyncSummary {
  const jobId = repository.createSyncJob(mode);
  const summary: SyncSummary = {
    jobId,
    read: records.length,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    errorMessages: [],
  };

  for (const record of records) {
    try {
      const result = sanitizeSourceCat(record);
      const sourceHash = sha256Of(result.asset);
      const outcome = repository.upsert(jobId, result.asset, sourceHash, result.issues);
      summary[outcome] += 1;
    } catch (error) {
      summary.errors += 1;
      summary.errorMessages.push(error instanceof Error ? error.message : String(error));
    }
  }

  repository.completeSyncJob(
    jobId,
    summary,
    summary.errorMessages.length ? summary.errorMessages.join("; ") : null,
  );
  return summary;
}
