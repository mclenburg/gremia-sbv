import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function runWithMissingAdapter(declared: boolean) {
  const root = mkdtempSync(join(tmpdir(), 'gremia-readiness-'));
  try {
    mkdirSync(join(root, 'scripts'));
    copyFileSync('scripts/check-build-readiness.cjs', join(root, 'scripts/check-build-readiness.cjs'));
    writeFileSync(join(root, 'postcss.config.js'), "export default { plugins: { '@tailwindcss/postcss': {} } };\n");
    writeFileSync(join(root, 'package.json'), JSON.stringify({
      name: 'readiness-fixture',
      version: '0.0.0',
      scripts: {
        'native:install-app-deps': 'node scripts/install-electron-app-deps.cjs',
        'native:rebuild:electron': 'node scripts/install-electron-app-deps.cjs',
      },
      devDependencies: declared ? { '@tailwindcss/postcss': '^4.0.0' } : {},
    }));
    return spawnSync(process.execPath, ['scripts/check-build-readiness.cjs'], {
      cwd: root,
      encoding: 'utf8',
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('Build-Readiness für installierte Abhängigkeiten', () => {
  it('meldet einen fehlenden Adapter im Paketvertrag', () => {
    const result = runWithMissingAdapter(false);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('package.json enthält @tailwindcss/postcss nicht');
  });

  it('stoppt bei einem nur deklarierten Adapter vor späteren Versionsprüfungen', () => {
    const result = runWithMissingAdapter(true);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('nicht in node_modules installiert');
    expect(result.stderr).not.toContain('Renderer-Version');
  });
});
