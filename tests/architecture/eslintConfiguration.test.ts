import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface EslintFlatConfigEntry {
  name?: string;
  files?: string[];
  rules?: Record<string, unknown>;
}

interface PackageScripts {
  lint?: string;
  'lint:fix'?: string;
  'build:app'?: string;
  'build:verify'?: string;
  'build:compile'?: string;
  'release:check'?: string;
}

async function loadEslintConfig(): Promise<EslintFlatConfigEntry[]> {
  const configUrl = new URL('../../eslint.config.js', import.meta.url).href;
  const configModule: unknown = await import(configUrl);

  if (
    typeof configModule !== 'object'
    || configModule === null
    || !('default' in configModule)
    || !Array.isArray(configModule.default)
  ) {
    throw new TypeError('eslint.config.js exportiert keine Flat-Config-Liste.');
  }

  return configModule.default as EslintFlatConfigEntry[];
}

function packageScripts(): PackageScripts {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: PackageScripts };
  return packageJson.scripts ?? {};
}

describe('0.9.6-m ESLint- und Freigabevertrag', () => {
  it('verwendet ESLint 10 über eine Flat Config', async () => {
    const config = await loadEslintConfig();

    expect(config.length).toBeGreaterThan(0);
    expect(packageScripts().lint).toBe('eslint .');
    expect(packageScripts()['lint:fix']).toBe('eslint . --fix');
  });

  it('begrenzt den Playwright-use-Fehlalarm auf die konkrete Fixture-Datei', async () => {
    const config = await loadEslintConfig();

    const typescriptConfig = config.find((entry) => entry.name === 'gremia/typescript');
    const fixtureOverride = config.find(
      (entry) => entry.name === 'gremia/playwright-fixture-callback',
    );

    expect(typescriptConfig?.rules?.['react-hooks/rules-of-hooks']).toBe('error');
    expect(fixtureOverride?.files).toEqual(['e2e/support/test.ts']);
    expect(fixtureOverride?.rules?.['react-hooks/rules-of-hooks']).toBe('off');
    expect(fixtureOverride?.rules?.['react-hooks/exhaustive-deps']).toBe('off');
  });

  it('führt Cleanup und Lint vor der eigentlichen App-Kompilierung aus', () => {
    const verify = packageScripts()['build:verify'] ?? '';
    const compile = packageScripts()['build:compile'] ?? '';
    const release = packageScripts()['release:check'] ?? '';

    expect(verify.indexOf('source:cleanup:strict')).toBeGreaterThanOrEqual(0);
    expect(verify.indexOf('npm run lint')).toBeGreaterThan(
      verify.indexOf('source:cleanup:strict'),
    );
    expect(compile).toContain('tsc -p tsconfig.json');
    expect(release).toContain('npm run build:verify');
  });
});
