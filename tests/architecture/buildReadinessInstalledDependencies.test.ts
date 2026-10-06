import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function runReadinessFixture(declared: boolean, postinstall?: string) {
  const root = mkdtempSync(join(tmpdir(), 'gremia-readiness-'));
  try {
    mkdirSync(join(root, 'scripts'));
    copyFileSync('scripts/check-build-readiness.cjs', join(root, 'scripts/check-build-readiness.cjs'));
    writeFileSync(join(root, 'postcss.config.js'), "export default { plugins: { '@tailwindcss/postcss': {} } };\n");
    writeFileSync(join(root, 'package.json'), JSON.stringify({
      name: 'readiness-fixture',
      version: '0.0.0',
      scripts: {
        ...(postinstall ? { postinstall } : {}),
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

describe('Build-Readiness für native Installation und Build-Abhängigkeiten', () => {
  it('stoppt einen impliziten nativen Rebuild beim npm install', () => {
    const result = runReadinessFixture(true, 'node scripts/install-electron-app-deps.cjs');

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('darf keinen postinstall-Rebuild ausführen');
    expect(result.stderr).not.toContain('nicht in node_modules installiert');
  });

  it('meldet einen fehlenden Adapter im Paketvertrag', () => {
    const result = runReadinessFixture(false);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('package.json enthält @tailwindcss/postcss nicht');
  });

  it('stoppt bei einem nur deklarierten Adapter vor späteren Versionsprüfungen', () => {
    const result = runReadinessFixture(true);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('nicht in node_modules installiert');
    expect(result.stderr).not.toContain('Renderer-Version');
  });
});
