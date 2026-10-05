import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
  author?: string;
  build?: {
    npmRebuild?: boolean;
    nodeGypRebuild?: boolean;
    win?: Record<string, unknown>;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
};
const readiness = require('../../../scripts/check-build-readiness.cjs') as {
  validateElectronBuilderConfiguration: (config: typeof pkg) => void;
  validateRuntimeDependencyBoundaries: (config: typeof pkg) => void;
};

describe('electron-builder configuration', () => {
  it('accepts the packaged Windows configuration', () => {
    expect(pkg.author).toBe('Gremia.SBV Contributors');
    expect(pkg.build?.win?.signAndEditExecutable).toBe(false);
    expect(pkg.build?.npmRebuild).toBe(false);
    expect(pkg.build?.nodeGypRebuild).toBe(false);
    expect(() => readiness.validateElectronBuilderConfiguration(pkg)).not.toThrow();
    expect(() => readiness.validateRuntimeDependencyBoundaries(pkg)).not.toThrow();
  });

  it('rejects a removed publisher option and build tools in runtime dependencies', () => {
    const invalidPublisher = {
      ...pkg,
      build: { ...pkg.build, win: { ...pkg.build?.win, publisherName: 'Legacy Publisher' } },
    };
    expect(() => readiness.validateElectronBuilderConfiguration(invalidPublisher)).toThrow(/publisherName/);

    const invalidDependencies = {
      ...pkg,
      dependencies: { ...pkg.dependencies, 'electron-builder': '^26.0.0' },
    };
    expect(() => readiness.validateRuntimeDependencyBoundaries(invalidDependencies)).toThrow(/electron-builder/);
  });
});

describe('electron-builder packaging', () => {
  it('filters known upstream noise but preserves actionable output and the builder exit status', () => {
    const project = mkdtempSync(join(tmpdir(), 'gremia-electron-builder-'));
    try {
      const binDir = join(project, 'node_modules', '.bin');
      mkdirSync(binDir, { recursive: true });
      const builder = join(binDir, process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
      const fakeBuilder = join(binDir, 'fake-builder.cjs');
      writeFileSync(fakeBuilder, [
        "console.log('duplicate dependency references');",
        "console.error('[DEP0190] DeprecationWarning: Passing args to a child process with shell option true');",
        "console.log('packaging failed: disk full');",
        "console.log(JSON.stringify({ args: process.argv.slice(2), nodeOptions: process.env.NODE_OPTIONS }));",
        'process.exit(7);',
      ].join('\n'));
      if (process.platform === 'win32') {
        writeFileSync(builder, `@echo off\r\n"${process.execPath}" "%~dp0\\fake-builder.cjs" %*\r\n`);
      } else {
        writeFileSync(builder, `#!/usr/bin/env node\nrequire('./fake-builder.cjs');\n`);
        chmodSync(builder, 0o755);
      }

      const result = spawnSync(process.execPath, [join(process.cwd(), 'scripts', 'run-electron-builder.cjs'), '--linux', 'AppImage'], {
        cwd: project,
        env: { ...process.env, NODE_OPTIONS: '' },
        encoding: 'utf8',
      });

      expect(result.error).toBeUndefined();
      expect(result.status).toBe(7);
      expect(result.stdout).toContain('packaging failed: disk full');
      expect(result.stdout).not.toContain('duplicate dependency references');
      expect(result.stderr).not.toContain('[DEP0190]');
      const metadata = JSON.parse(result.stdout.trim().split('\n').at(-1) ?? '') as { args: string[]; nodeOptions: string };
      expect(metadata.args).toEqual(['--linux', 'AppImage']);
      expect(metadata.nodeOptions.split(/\s+/)).toContain('--no-deprecation');
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
