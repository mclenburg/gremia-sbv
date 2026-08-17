import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const githubBuild = require('../../scripts/run-github-build-current-os.cjs') as {
  buildSequence(): Array<[string, string[]]>;
};

describe('0.9.5-e local GitHub build command', () => {
  it('uses the shared quality gate before compilation and packaging', () => {
    const sequence = githubBuild.buildSequence().map(([command, args]) => [command, ...args].join(' '));

    expect(sequence.slice(0, 3)).toEqual([
      'npm ci',
      'npm run build:quality',
      'npm run build:compile',
    ]);
    expect(sequence.some((command) => /^npm run build:package:(linux|windows|mac)$/u.test(command))).toBe(true);
    expect(sequence).not.toContain('npm run licenses:generate');
  });
});
