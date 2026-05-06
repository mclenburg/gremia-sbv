import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readme = readFileSync('README.md', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

describe('public README readiness', () => {
  it('addresses SBVs searching for local confidential SBV software', () => {
    expect(readme).toContain(`Stand: **${pkg.version}**`);
    for (const phrase of [
      'Schwerbehindertenvertretungen',
      'SBV Software',
      'BEM',
      '§ 167 SGB IX',
      '§ 178 SGB IX',
      'offline-first',
      'keine Cloud',
      'keine Telemetrie',
      'ohne HR-Zugriff',
    ]) {
      expect(readme).toContain(phrase);
    }
  });

  it('states differentiators without promising legal or DSGVO guarantees', () => {
    expect(readme).toContain('SBV-first');
    expect(readme).toContain('Lebende Arbeitschronik');
    expect(readme).toContain('Datenschutzbewusst');
    expect(readme).toContain('keine Rechtsberatung');
    expect(readme).not.toMatch(/rechtssicher garantiert/i);
    expect(readme).not.toMatch(/DSGVO-konform garantiert/i);
  });
});
