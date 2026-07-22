import type { UntrustedSourceCat } from '../domain/cat-asset.js';

export interface SourceCatSummary {
  sourceId: string;
  name: string;
  sex: string | null;
  adoptionStatus: string;
  image: string | null;
  stationId: string | null;
  sourceUpdatedAt: string;
}

export interface SourceCatDetail {
  /** Raw allowlisted source fields; must pass through the sanitizer before use. */
  untrusted: UntrustedSourceCat;
  sourceUpdatedAt: Date;
}
