import { describe, expect, it } from 'vitest';
import { collectTestQualityFiles, summarizeTestQuality } from './helpers/testQualityMetrics';

describe('0.9.1 test quality ratio', () => {
  it('keeps behavior and result tests as the clear majority', () => {
    const summary = summarizeTestQuality(collectTestQualityFiles());
    expect(summary.behaviorRatio, JSON.stringify(summary, null, 2)).toBeGreaterThanOrEqual(0.68);
    expect(summary.sourceStringRatio, JSON.stringify(summary.sourceStringFiles, null, 2)).toBeLessThanOrEqual(0.32);
  });
});
