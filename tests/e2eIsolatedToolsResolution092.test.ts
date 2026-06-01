import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireFromTest = createRequire(import.meta.url);
const runner = requireFromTest('../scripts/run-e2e.cjs') as {
  resolvePlaywrightRunner(root: string): { kind: string; command: string; argsPrefix: string[] } | null;
};

function withTempProject(testBody: (root: string) => void) {
  const root = join(tmpdir(), `gremia-sbv-e2e-tools-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  try {
    mkdirSync(root, { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"name":"e2e-tools-test"}\n');
    testBody(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function writeIsolatedPlaywrightPackage(root: string) {
  const packageRoot = join(root, '.e2e-tools', 'node_modules', '@playwright', 'test');
  mkdirSync(packageRoot, { recursive: true });
  writeFileSync(join(root, '.e2e-tools', 'package.json'), '{"name":"gremia-sbv-e2e-tools","private":true}\n');
  writeFileSync(join(packageRoot, 'package.json'), '{"name":"@playwright/test"}\n');
  writeFileSync(join(packageRoot, 'cli.js'), 'process.exit(0);\n');
}

describe('isolierte E2E-Werkzeugauflösung', () => {
  it('nutzt die isolierte Playwright-CLI über node statt über die Plattform-.bin-Shell', () => {
    withTempProject((root) => {
      writeIsolatedPlaywrightPackage(root);

      const resolved = runner.resolvePlaywrightRunner(root);

      expect(resolved?.kind).toBe('isolated-cli');
      expect(resolved?.command).toBe(process.execPath);
      expect(resolved?.argsPrefix[0]).toBe(resolve(root, '.e2e-tools', 'node_modules', '@playwright', 'test', 'cli.js'));
    });
  });


  it('installiert Chromium unter Linux-CI mit Systemabhängigkeiten, ohne Windows zu belasten', () => {
    const browserInstaller = requireFromTest('../scripts/install-e2e-browsers.cjs') as {
      browserInstallArgs: (platform?: string, isCi?: boolean) => string[];
    };

    expect(browserInstaller.browserInstallArgs('linux', true)).toEqual(['install', '--with-deps', 'chromium']);
    expect(browserInstaller.browserInstallArgs('linux', false)).toEqual(['install', 'chromium']);
    expect(browserInstaller.browserInstallArgs('win32', true)).toEqual(['install', 'chromium']);
  });

  it('kann in GitHub Actions vorhandenen System-Chrome nutzen und den Playwright-Browserdownload ueberspringen', () => {
    const browserInstaller = requireFromTest('../scripts/install-e2e-browsers.cjs') as {
      browserInstallArgs: (platform?: string, isCi?: boolean) => string[];
      shouldUseSystemChrome: (env?: NodeJS.ProcessEnv) => boolean;
      systemChromeCandidates: (platform?: string) => string[];
    };

    expect(browserInstaller.shouldUseSystemChrome({ GREMIA_SBV_E2E_USE_SYSTEM_CHROME: '1' } as NodeJS.ProcessEnv)).toBe(true);
    expect(browserInstaller.shouldUseSystemChrome({} as NodeJS.ProcessEnv)).toBe(false);
    expect(browserInstaller.systemChromeCandidates('linux')).toContain('/usr/bin/google-chrome');
  });

  it('haelt Playwright- und Axe-Imports in der Config und im Axe-Test vom App-node_modules entkoppelt', () => {
    const config = readFileSync('playwright.config.ts', 'utf8');
    const axeSpec = readFileSync('e2e/accessibility-axe.spec.ts', 'utf8');
    const support = readFileSync('e2e/support/test.ts', 'utf8');

    expect(config).not.toContain("from '@playwright/test'");
    expect(config).toContain('createRequire(isolatedToolsPackage)');
    expect(config).toContain("channel: 'chrome'");
    expect(axeSpec).not.toContain("from '@axe-core/playwright'");
    expect(axeSpec).toContain("requireE2eTool('@axe-core/playwright')");
    expect(support).not.toContain("from '@playwright/test'");
    expect(support).toContain("requireE2eTool<");

    const workflow = readFileSync('.github/workflows/build-release.yml', 'utf8');
    expect(workflow).toContain('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"');
    expect(workflow).toContain('GREMIA_SBV_E2E_USE_SYSTEM_CHROME: "1"');
    expect(workflow).toContain('PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"');
    expect(workflow).toContain('actions/checkout@v4');
    expect(workflow).toContain('actions/setup-node@v4');
  });
});
