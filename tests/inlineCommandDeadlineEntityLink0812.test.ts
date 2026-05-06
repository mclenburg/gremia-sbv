import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.8.12 deadline inline entity link', () => {
  it('uses the deadline bridge directly so /fr can persist the created target id', () => {
    const hook = readFileSync('src/app/features/cases/inlineCommands/useInlineCommands.ts', 'utf8');
    expect(hook).toContain('const created = await bridge.deadlines.create');
    expect(hook).toContain('targetType: "deadline"');
    expect(hook).toContain('Frist öffnen');
  });
});
