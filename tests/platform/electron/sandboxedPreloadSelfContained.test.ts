import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};
const preloadConfig = fs.readFileSync(path.join(projectRoot, 'vite.preload.config.ts'), 'utf8');
const sourceBoundaryCheck = fs.readFileSync(path.join(projectRoot, 'scripts', 'check-preload-source-boundary.cjs'), 'utf8');
const bundleCheck = fs.readFileSync(path.join(projectRoot, 'scripts', 'check-preload-bundle.cjs'), 'utf8');
const preloadInvoker = fs.readFileSync(path.join(projectRoot, 'electron', 'preload', 'invoke.ts'), 'utf8');

describe('0.9.6-l sandboxed preload contract', () => {
  it('bündelt den sandboxed Preload ohne Main-Process- oder Node-Laufzeitabhängigkeiten', () => {
    expect(packageJson.scripts['build:preload']).toContain('node scripts/check-preload-source-boundary.cjs && vite build --config vite.preload.config.ts && node scripts/check-preload-bundle.cjs');
    expect(packageJson.scripts['build:compile']).toMatch(/tsc -p tsconfig\.electron\.json && npm run build:preload && node scripts\/write-electron-cjs-package\.cjs/);
    expect(preloadConfig).toContain("formats: ['cjs']");
    expect(preloadConfig).toContain("external: ['electron']");
    expect(preloadConfig).toContain("fileName: () => 'preload.js'");
    expect(sourceBoundaryCheck).toContain("allowedExternal = new Set(['electron'])");
    expect(sourceBoundaryCheck).toContain('forbiddenMainProcessModules');
    expect(bundleCheck).toContain(`/require\\(["']\\.{1,2}\\//`);
    expect(bundleCheck).toContain("specifier !== 'electron'");
    expect(preloadInvoker).not.toContain('node:path');
    expect(preloadInvoker).toContain('../ipc/errorProtocol.js');
    expect(preloadInvoker).not.toContain('../ipc/ipcHandler.js');
  });
});
