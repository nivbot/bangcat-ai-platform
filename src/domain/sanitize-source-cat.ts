import {
  adoptionStatuses,
  type AdoptionStatus,
  type MediaUsageScope,
  type PublicCatAsset,
  type PublicMediaAsset,
  type SanitizationIssue,
  type SanitizationResult,
  type Sex,
  type SourceMediaInput,
  type UntrustedSourceCat,
} from "./cat-asset.ts";
import { redactPublicText } from "./privacy.ts";

const allowedSourceFields = new Set([
  "id",
  "name",
  "sex",
  "approximateAgeMonths",
  "breed",
  "coatColor",
  "adoptionStatus",
  "description",
  "rescueStory",
  "personalityNotes",
  "updatedAt",
  "isPublic",
  "media",
]);

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function publicText(
  value: unknown,
  field: string,
  issues: SanitizationIssue[],
): string | null {
  const raw = text(value);
  if (!raw) return null;
  const redacted = redactPublicText(raw);
  if (redacted.redacted) {
    issues.push({
      field,
      code: "redacted",
      message: `Removed sensitive ${redacted.categories.join(", ")} information from public text.`,
    });
  }
  return redacted.value || null;
}

function normalizeSex(value: unknown, issues: SanitizationIssue[]): Sex {
  if (value === "male" || value === "female" || value === "unknown") return value;
  if (value === "公" || value === "公猫") return "male";
  if (value === "母" || value === "母猫") return "female";
  if (value != null) {
    issues.push({ field: "sex", code: "invalid", message: "Unknown sex value; normalized to unknown." });
  }
  return "unknown";
}

function normalizeAdoptionStatus(
  value: unknown,
  issues: SanitizationIssue[],
): AdoptionStatus {
  if (typeof value === "string" && adoptionStatuses.includes(value as AdoptionStatus)) {
    return value as AdoptionStatus;
  }
  const aliases: Record<string, AdoptionStatus> = {
    待领养: "available",
    可领养: "available",
    领养中: "pending",
    已领养: "adopted",
    暂不可领养: "not_available",
  };
  if (typeof value === "string" && aliases[value]) return aliases[value];
  issues.push({
    field: "adoptionStatus",
    code: value == null ? "missing" : "invalid",
    message: "Adoption status is missing or unsupported; normalized to unknown.",
  });
  return "unknown";
}

function normalizeAge(value: unknown, issues: SanitizationIssue[]): number | null {
  if (value == null || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0 || numberValue > 360) {
    issues.push({
      field: "approximateAgeMonths",
      code: "invalid",
      message: "Age must be between 0 and 360 months.",
    });
    return null;
  }
  return Math.round(numberValue);
}

function normalizeUsageScope(value: unknown): MediaUsageScope {
  if (
    value === "internal_only" ||
    value === "official_channels" ||
    value === "partner_creators" ||
    value === "public_mcp"
  ) {
    return value;
  }
  return "official_channels";
}

function normalizeMedia(value: unknown, issues: SanitizationIssue[]): PublicMediaAsset[] {
  if (!Array.isArray(value)) return [];
  const output: PublicMediaAsset[] = [];

  for (const [index, untyped] of value.entries()) {
    if (!untyped || typeof untyped !== "object") continue;
    const item = untyped as SourceMediaInput;
    if (item.isPublic === false) {
      issues.push({
        field: `media[${index}]`,
        code: "excluded",
        message: "Non-public media was excluded.",
      });
      continue;
    }
    const id = text(item.id);
    const url = text(item.url);
    if (!id || !url || !/^https?:\/\//i.test(url)) {
      issues.push({
        field: `media[${index}]`,
        code: "invalid",
        message: "Media requires an id and an http(s) URL.",
      });
      continue;
    }
    output.push({
      sourceMediaId: id,
      url,
      kind: item.kind === "video" ? "video" : "image",
      usageScope: normalizeUsageScope(item.usageScope),
      altText: publicText(item.altText, `media[${index}].altText`, issues),
    });
  }

  return output;
}

function completenessScore(asset: Omit<PublicCatAsset, "completenessScore">): number {
  const checks = [
    Boolean(asset.name),
    asset.sex !== "unknown",
    asset.approximateAgeMonths !== null,
    Boolean(asset.breed),
    Boolean(asset.coatColor),
    asset.adoptionStatus !== "unknown",
    Boolean(asset.publicDescription),
    Boolean(asset.publicRescueStory),
    Boolean(asset.publicPersonalityNotes),
    asset.media.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export function sanitizeSourceCat(source: UntrustedSourceCat): SanitizationResult {
  const issues: SanitizationIssue[] = [];
  const sourceId = text(source.id);
  const name = text(source.name);
  if (!sourceId) throw new Error("Source cat id is required.");
  if (!name) throw new Error(`Source cat ${sourceId} is missing a public name.`);

  const base: Omit<PublicCatAsset, "completenessScore"> = {
    sourceId,
    name,
    sex: normalizeSex(source.sex, issues),
    approximateAgeMonths: normalizeAge(source.approximateAgeMonths, issues),
    breed: publicText(source.breed, "breed", issues),
    coatColor: publicText(source.coatColor, "coatColor", issues),
    adoptionStatus: normalizeAdoptionStatus(source.adoptionStatus, issues),
    publicDescription: publicText(source.description, "description", issues),
    publicRescueStory: publicText(source.rescueStory, "rescueStory", issues),
    publicPersonalityNotes: publicText(source.personalityNotes, "personalityNotes", issues),
    sourceUpdatedAt: text(source.updatedAt) ?? new Date(0).toISOString(),
    isPublic: source.isPublic !== false,
    media: normalizeMedia(source.media, issues),
  };

  const excludedSourceFields = Object.keys(source).filter((key) => !allowedSourceFields.has(key));
  for (const field of excludedSourceFields) {
    issues.push({
      field,
      code: "excluded",
      message: "Field is not on the AI asset allowlist and was not copied.",
    });
  }

  return {
    asset: { ...base, completenessScore: completenessScore(base) },
    issues,
    excludedSourceFields,
  };
}
