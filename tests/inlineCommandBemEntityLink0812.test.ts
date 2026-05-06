import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 BEM inline entity link', () => {
  it('remembers a persisted entity link when /bem creates a BEM process', () => {
    const hook = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');
    expect(hook).toContain('const created = await bridge.bem.create');
    expect(hook).toContain('targetType: "bem"');
    expect(hook).toContain('rememberEntityLink');
    expect(hook).toContain('formatBemMarkerText');
  });
});
