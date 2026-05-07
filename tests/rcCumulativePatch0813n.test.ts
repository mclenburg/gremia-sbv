import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (file: string) => readFileSync(file, 'utf8');

describe('final cumulative RC patch contracts', () => {
  it('ships the TypeScript fixes that were missing from partial patch application', () => {
    const securityTest = read('tests/securityServiceBehavior0813f.test.ts');
    const linkTest = read('tests/caseNoteEntityLinkBehavior0813e.test.ts');

    expect(securityTest).toContain('type VaultDatabaseOpener');
    expect(securityTest).not.toContain('SecurityService &');
    expect(securityTest).toContain('service as unknown as VaultDatabaseOpener');

    expect(linkTest).toContain('selectionForLink(record)');
    expect(linkTest).toContain("selection?.type !== 'process'");
    expect(linkTest).toContain('expect(selection.id).toBe(record.targetId)');
  });

  it('ships the current equalization template status behavior test and license files', () => {
    const equalizationTest = read('tests/equalizationTemplateStatus061d.test.ts');
    const modalSource = read('src/app/features/cases/ProcessTemplateDocumentsModal.tsx');
    expect(equalizationTest).toContain('processTemplateStatusLabel');
    expect(equalizationTest).toContain('processTemplateStatusTag');
    expect(modalSource).not.toContain(['function', 'isEqualizationProcessRecord'].join(' '));
    expect(modalSource).not.toContain(['function', 'hasGenericProcessStatus'].join(' '));

    const pkg = JSON.parse(read('package.json')) as { license?: string };
    expect(pkg.license).toBe('AGPL-3.0-or-later');
    expect(existsSync('LICENSE')).toBe(true);
    expect(existsSync('NOTICE')).toBe(true);
    expect(existsSync('docs/LICENSE_POLICY.md')).toBe(true);
  });

  it('keeps obsolete historical tests delegated to source cleanup', () => {
    const manifest = read('maintenance/source-cleanup/obsolete-files-0.8.13-n.json');
    for (const obsolete of [
      'tests/releaseReadiness088c.test.ts',
      'tests/sourceCleanupWindows088h4.test.ts',
      'tests/buildReadiness088.test.ts',
      'tests/sourceCleanup087b.test.ts',
      'tests/equalizationTemplateStatus061c.test.ts',
      'tests/equalizationBuildFix061b.test.ts'
    ]) {
      expect(manifest).toContain(obsolete);
    }
  });
});
