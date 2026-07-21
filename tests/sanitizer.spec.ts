import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sanitizeSourceCat } from '../src/domain/sanitize-source-cat.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/source-cats.json', import.meta.url), 'utf8'),
) as Array<Record<string, unknown>>;

describe('sanitizeSourceCat', () => {
  it('copies only allowlisted fields and redacts sensitive text', () => {
    const result = sanitizeSourceCat(fixture[0]);

    expect(result.asset.name).toBe('裤兜');
    expect(result.asset.sex).toBe('male');
    expect(result.asset.adoptionStatus).toBe('available');
    expect(result.asset.publicRescueStory).toMatch(/已脱敏手机号/);
    expect(result.asset.media).toHaveLength(1);
    expect([...result.excludedSourceFields].sort()).toEqual(['internalNotes', 'rescuerPhone']);
    expect('rescuerPhone' in result.asset).toBe(false);
  });

  it('rejects a record without a stable source id', () => {
    expect(() => sanitizeSourceCat({ name: '无编号猫' })).toThrow(/id is required/);
  });
});
