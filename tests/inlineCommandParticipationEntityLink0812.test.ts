import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 participation inline entity link', () => {
  it('remembers a persisted entity link when /bet creates a participation process', () => {
    const hook = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');
    expect(hook).toContain('const created = await bridge.participation.create');
    expect(hook).toContain('targetType: "participation"');
    expect(hook).toContain('SBV-Beteiligung öffnen');
  });
});
