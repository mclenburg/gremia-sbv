import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('0.8.12-c case note link TypeScript build guard', () => {
  it('imports the case note link types used by the service mapper', () => {
    const source = readFileSync('services/caseService.ts', 'utf8');

    expect(source).toContain('CaseNoteLinkRecord');
    expect(source).toContain('CreateCaseNoteLinkInput');
    expect(source).toContain('../src/app/core/models/case-note-link.model.js');
  });

  it('keeps the native Electron dependency rebuild contract stable', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.version).toMatch(/^0\.8\.12(?:-[a-z])?$/);
    expect(pkg.scripts.postinstall).toBe('electron-builder install-app-deps');
  });
});
