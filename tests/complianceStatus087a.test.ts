import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/app/features/compliance/ComplianceView.tsx', 'utf8');

describe('0.8.7-a compliance status build fix', () => {
  it('guards bridge.security before loading compliance status', () => {
    expect(source).toContain('if (!bridge?.security)');
    expect(source).toContain('const security = bridge.security');
    expect(source).toContain('await security.status()');
    expect(source).toContain('await security.temporaryFileStatus()');
  });
});
