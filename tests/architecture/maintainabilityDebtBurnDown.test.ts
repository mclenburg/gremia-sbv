import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type MetricName = 'physicalLines' | 'codeLines' | 'maxFunctionLines' | 'imports';
type Baseline = {
  limits: Record<MetricName, number>;
  debt: Record<string, Record<MetricName, number>>;
};

describe('Maintainability debt burn-down', () => {
  it('lässt nach Patch 43 nur noch Funktionslängenschuld in der Baseline zu', () => {
    const baseline = JSON.parse(
      readFileSync('maintenance/architecture/maintainability-baseline.json', 'utf8'),
    ) as Baseline;

    const nonFunctionDebt = Object.entries(baseline.debt).flatMap(([file, metrics]) =>
      (['physicalLines', 'codeLines', 'imports'] as const)
        .filter((metric) => metrics[metric] > baseline.limits[metric])
        .map((metric) => `${file}:${metric}=${metrics[metric]}`),
    );

    expect(nonFunctionDebt).toEqual([]);
    expect(Object.keys(baseline.debt).length).toBeLessThan(76);
    expect(Object.values(baseline.debt).every((metrics) => metrics.maxFunctionLines > baseline.limits.maxFunctionLines)).toBe(true);
  });
});
