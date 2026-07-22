export const REFERENCE_ANALYSIS_SCHEMA_VERSION = 'reference-analysis/v1';

/**
 * Versioned structural analysis of one approved reference case. Everything
 * here is abstract pattern language; source-specific wording, names and
 * verbatim text are contractually banned (see `validateReferenceAnalysis`).
 */
export interface ReferenceAnalysisV1 {
  schemaVersion: typeof REFERENCE_ANALYSIS_SCHEMA_VERSION;
  /** What the title does (curiosity gap, contrast, promise), not what it says. */
  titleFunction: string[];
  /** Ordered abstract narrative beats. */
  narrativeBeats: string[];
  /** Ordered emotional stages, e.g. ["calm", "surprise", "warm"]. */
  emotionCurve: string[];
  /** Abstract visual guidance: shot types, palette, composition. */
  visualGrammar: string[];
  /** How the audience is invited to interact; null when not applicable. */
  interactionMechanism: string | null;
  /** Elements downstream generation must never reproduce. */
  prohibitedElements: string[];
  /** Source-specific identifiers (names, places, brands) the model noticed. */
  sourceSpecificElements: string[];
}

export interface ReferenceAnalysisValidationIssue {
  field: string;
  code: 'missing' | 'invalid' | 'schema_version' | 'source_leak';
  message: string;
}

function stringArray(value: unknown, min: number): string[] | null {
  if (!Array.isArray(value)) return null;
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return items.length >= min ? items.map((item) => item.trim()) : null;
}

function extractSnippet(value: string): string {
  return value.trim().slice(0, 24);
}

/**
 * Parse and validate untrusted model output against the v1 schema.
 * Returns null when the output is unusable; issues explain why.
 */
export function parseReferenceAnalysis(
  raw: string,
): { analysis: ReferenceAnalysisV1 | null; issues: ReferenceAnalysisValidationIssue[] } {
  const issues: ReferenceAnalysisValidationIssue[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { analysis: null, issues: [{ field: 'root', code: 'invalid', message: 'Output is not valid JSON.' }] };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { analysis: null, issues: [{ field: 'root', code: 'invalid', message: 'Output must be a JSON object.' }] };
  }
  const record = parsed as Record<string, unknown>;

  if (record['schemaVersion'] !== REFERENCE_ANALYSIS_SCHEMA_VERSION) {
    issues.push({
      field: 'schemaVersion',
      code: 'schema_version',
      message: `Expected ${REFERENCE_ANALYSIS_SCHEMA_VERSION}.`,
    });
  }
  const titleFunction = stringArray(record['titleFunction'], 1);
  if (!titleFunction) issues.push({ field: 'titleFunction', code: 'missing', message: 'Need at least one title function.' });
  const narrativeBeats = stringArray(record['narrativeBeats'], 2);
  if (!narrativeBeats) issues.push({ field: 'narrativeBeats', code: 'missing', message: 'Need at least two narrative beats.' });
  const emotionCurve = stringArray(record['emotionCurve'], 2);
  if (!emotionCurve) issues.push({ field: 'emotionCurve', code: 'missing', message: 'Need at least two emotional stages.' });
  const visualGrammar = stringArray(record['visualGrammar'], 1);
  if (!visualGrammar) issues.push({ field: 'visualGrammar', code: 'missing', message: 'Need at least one visual grammar item.' });
  const prohibitedElements = stringArray(record['prohibitedElements'], 0) ?? [];
  const sourceSpecificElements = stringArray(record['sourceSpecificElements'], 0) ?? [];
  const interactionMechanism =
    typeof record['interactionMechanism'] === 'string' && record['interactionMechanism'].trim().length > 0
      ? record['interactionMechanism'].trim()
      : null;

  // Copyright guard: abstract fields must not contain source-specific text.
  const abstractFields: Array<[string, string[]]> = [
    ['titleFunction', titleFunction ?? []],
    ['narrativeBeats', narrativeBeats ?? []],
    ['emotionCurve', emotionCurve ?? []],
    ['visualGrammar', visualGrammar ?? []],
  ];
  for (const [field, items] of abstractFields) {
    for (const item of items) {
      for (const specific of sourceSpecificElements) {
        if (specific.length >= 2 && item.includes(specific)) {
          issues.push({
            field,
            code: 'source_leak',
            message: `Abstract field contains source-specific element "${extractSnippet(specific)}".`,
          });
        }
      }
    }
  }

  if (issues.length > 0 || !titleFunction || !narrativeBeats || !emotionCurve || !visualGrammar) {
    return { analysis: null, issues };
  }
  return {
    analysis: {
      schemaVersion: REFERENCE_ANALYSIS_SCHEMA_VERSION,
      titleFunction,
      narrativeBeats,
      emotionCurve,
      visualGrammar,
      interactionMechanism,
      prohibitedElements,
      sourceSpecificElements,
    },
    issues,
  };
}
