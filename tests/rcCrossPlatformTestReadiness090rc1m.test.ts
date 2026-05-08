import { describe, expect, it } from 'vitest';
import { readNormalizedSourceText } from './helpers/sourceText';

const packageJson = JSON.parse(readNormalizedSourceText('package.json')) as { scripts: Record<string, string> };
const e2eRunner = readNormalizedSourceText('scripts/run-e2e.cjs');
const gitAttributes = readNormalizedSourceText('.gitattributes');
const cssRegressionD = readNormalizedSourceText('tests/rcFixCasePreventionCss090rc1d.test.ts');
const cssRegressionE = readNormalizedSourceText('tests/rcFixCasePreventionCss090rc1e.test.ts');

describe('0.9.0-rc.1-m cross-platform test readiness', () => {
  it('keeps RC text-based regression tests line-ending independent for Windows checkouts', () => {
    for (const source of [cssRegressionD, cssRegressionE]) {
      expect(source).toContain("readNormalizedSourceText('src/styles/globals.css')");
      expect(source).toContain("readNormalizedSourceText('src/app/features/prevention/PreventionProcessDetail.tsx')");
      expect(source).not.toContain("readFileSync('src/styles/globals.css', 'utf8')");
    }
  });

  it('pins repository text files to LF so Windows checkouts do not break source-string tests', () => {
    expect(gitAttributes).toContain('* text=auto eol=lf');
    expect(gitAttributes).toContain('*.zip binary');
  });

  it('keeps npm test entry points executable through node/vitest/playwright without POSIX shell assumptions', () => {
    expect(packageJson.scripts.test).toBe('vitest run');
    expect(packageJson.scripts['test:e2e']).toBe('node scripts/run-e2e.cjs');
    expect(packageJson.scripts['test:e2e:inline-commands']).toBe('node scripts/run-e2e.cjs e2e/inline-commands.spec.ts');
    expect(packageJson.scripts['test:rc-cross-platform-readiness-090rc1m']).toBe('vitest run tests/rcCrossPlatformTestReadiness090rc1m.test.ts');
  });

  it('uses the Windows Playwright command shim and shell only on Windows in the e2e runner', () => {
    expect(e2eRunner).toContain("process.platform === 'win32'");
    expect(e2eRunner).toContain('`${name}.cmd`');
    expect(e2eRunner).toContain("shell: process.platform === 'win32'");
    expect(e2eRunner).toContain('normalizeSpecPathArg');
  });
});
