import { describe, expect, it } from 'vitest';
import {
  parseReferenceAnalysis,
  REFERENCE_ANALYSIS_SCHEMA_VERSION,
} from '../src/domain/reference-analysis.js';

const validOutput = JSON.stringify({
  schemaVersion: 'reference-analysis/v1',
  titleFunction: ['制造反差悬念'],
  narrativeBeats: ['建立距离感', '意外转折', '行动呼吁'],
  emotionCurve: ['平静', '意外', '温暖'],
  visualGrammar: ['中远景独处', '特写互动'],
  interactionMechanism: '评论区征集同类瞬间',
  prohibitedElements: ['不复制原文措辞'],
  sourceSpecificElements: ['原案例猫名球球'],
});

describe('parseReferenceAnalysis', () => {
  it('accepts schema-valid abstract output', () => {
    const { analysis, issues } = parseReferenceAnalysis(validOutput);
    expect(issues).toEqual([]);
    expect(analysis?.schemaVersion).toBe(REFERENCE_ANALYSIS_SCHEMA_VERSION);
    expect(analysis?.narrativeBeats).toHaveLength(3);
  });

  it('rejects non-JSON output', () => {
    const { analysis, issues } = parseReferenceAnalysis('not json at all');
    expect(analysis).toBeNull();
    expect(issues[0]?.code).toBe('invalid');
  });

  it('rejects wrong schema version', () => {
    const bad = JSON.parse(validOutput) as Record<string, unknown>;
    bad['schemaVersion'] = 'reference-analysis/v0';
    const { analysis, issues } = parseReferenceAnalysis(JSON.stringify(bad));
    expect(analysis).toBeNull();
    expect(issues.some((issue) => issue.code === 'schema_version')).toBe(true);
  });

  it('rejects missing required abstract fields', () => {
    const bad = JSON.parse(validOutput) as Record<string, unknown>;
    bad['narrativeBeats'] = ['只有一个节拍'];
    const { analysis, issues } = parseReferenceAnalysis(JSON.stringify(bad));
    expect(analysis).toBeNull();
    expect(issues.some((issue) => issue.field === 'narrativeBeats')).toBe(true);
  });

  it('flags source-specific text leaking into abstract fields', () => {
    const bad = JSON.parse(validOutput) as Record<string, unknown>;
    bad['narrativeBeats'] = ['先展示原案例猫名球球的日常', '意外转折'];
    const { analysis, issues } = parseReferenceAnalysis(JSON.stringify(bad));
    expect(analysis).toBeNull();
    expect(issues.some((issue) => issue.code === 'source_leak')).toBe(true);
  });
});
