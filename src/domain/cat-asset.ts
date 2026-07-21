export const adoptionStatuses = [
  "available",
  "pending",
  "adopted",
  "not_available",
  "unknown",
] as const;

export type AdoptionStatus = (typeof adoptionStatuses)[number];
export type Sex = "male" | "female" | "unknown";
export type MediaUsageScope =
  | "internal_only"
  | "official_channels"
  | "partner_creators"
  | "public_mcp";

export interface SourceMediaInput {
  id?: unknown;
  url?: unknown;
  kind?: unknown;
  isPublic?: unknown;
  usageScope?: unknown;
  altText?: unknown;
}

/**
 * This intentionally models an untrusted source record. Extra fields may exist,
 * but the sanitizer only copies the explicit public allowlist below.
 */
export type UntrustedSourceCat = Record<string, unknown>;

export interface PublicMediaAsset {
  sourceMediaId: string;
  url: string;
  kind: "image" | "video";
  usageScope: MediaUsageScope;
  altText: string | null;
}

export interface PublicCatAsset {
  sourceId: string;
  name: string;
  sex: Sex;
  approximateAgeMonths: number | null;
  breed: string | null;
  coatColor: string | null;
  adoptionStatus: AdoptionStatus;
  publicDescription: string | null;
  publicRescueStory: string | null;
  publicPersonalityNotes: string | null;
  sourceUpdatedAt: string;
  isPublic: boolean;
  completenessScore: number;
  media: PublicMediaAsset[];
}

export interface SanitizationIssue {
  field: string;
  code: "missing" | "invalid" | "redacted" | "excluded";
  message: string;
}

export interface SanitizationResult {
  asset: PublicCatAsset;
  issues: SanitizationIssue[];
  excludedSourceFields: string[];
}
