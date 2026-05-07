import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('service coverage configuration', () => {
  it('uses v8 coverage and gates the services layer at 70 percent', () => {
    const config = readFileSync('vitest.config.ts', 'utf8');

    expect(config).toContain("provider: 'v8'");
    expect(config).toContain("'services/**/*.ts'");
    expect(config).toContain('branches: 70');
    expect(config).toContain('functions: 70');
    expect(config).toContain('lines: 70');
    expect(config).toContain('statements: 70');
  });
});
