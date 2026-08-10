import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const nativeGuard = require('../../scripts/ensure-node-native-deps.cjs') as {
  isNativeAbiFailure(error: unknown): boolean;
  sanitizedNodeRebuildEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
  ensureNodeNativeDeps(options: {
    probe?: (...args: unknown[]) => { status: number; stdout?: string; stderr?: string };
    spawn: (...args: unknown[]) => { status: number; stdout?: string; stderr?: string };
    env?: NodeJS.ProcessEnv;
  }): { rebuilt: boolean };
};

describe('Node-native Testlaufzeit', () => {
  it('erkennt ABI- und Self-register-Fehler gezielt', () => {
    expect(nativeGuard.isNativeAbiFailure(new Error('NODE_MODULE_VERSION 140, requires 137'))).toBe(true);
    expect(nativeGuard.isNativeAbiFailure(new Error('Module did not self-register'))).toBe(true);
    expect(nativeGuard.isNativeAbiFailure(new Error('fachlicher Fehler'))).toBe(false);
  });

  it('rebuildet bei ABI-Fehler und validiert danach in einem frischen Probeprozess', () => {
    let probes = 0;
    let rebuilds = 0;
    const result = nativeGuard.ensureNodeNativeDeps({
      probe: () => {
        probes += 1;
        return probes === 1
          ? { status: 1, stderr: 'NODE_MODULE_VERSION 140. This version of Node.js requires NODE_MODULE_VERSION 137.' }
          : { status: 0, stdout: '' };
      },
      spawn: () => {
        rebuilds += 1;
        return { status: 0 };
      },
      env: {},
    });

    expect(result).toEqual({ rebuilt: true });
    expect(probes).toBe(2);
    expect(rebuilds).toBe(1);
  });

  it('entfernt Electron-/Target-Konfiguration aus dem Node-Rebuild', () => {
    const env = nativeGuard.sanitizedNodeRebuildEnv({
      HOME: path.join(os.tmpdir(), 'gremia-home'),
      npm_config_runtime: 'electron',
      NPM_CONFIG_TARGET: '39.0.0',
      npm_config_disturl: 'https://electronjs.org/headers',
      npm_config_build_from_source: 'true',
      npm_config_arch: 'x64',
    });

    expect(env.HOME).toBe(path.join(os.tmpdir(), 'gremia-home'));
    expect(env.npm_config_runtime).toBeUndefined();
    expect(env.NPM_CONFIG_TARGET).toBeUndefined();
    expect(env.npm_config_disturl).toBeUndefined();
    expect(env.npm_config_build_from_source).toBeUndefined();
    expect(env.npm_config_arch).toBeUndefined();
  });

  it('lässt fachfremde Ladefehler unverändert hochkommen', () => {
    expect(() => nativeGuard.ensureNodeNativeDeps({
      probe: () => ({ status: 1, stderr: 'unexpected package error' }),
      spawn: () => ({ status: 0 }),
      env: {},
    })).toThrow('unexpected package error');
  });

  it('bricht klar ab, wenn das Addon auch nach erfolgreichem Rebuild nicht zur Node-ABI passt', () => {
    expect(() => nativeGuard.ensureNodeNativeDeps({
      probe: () => ({ status: 1, stderr: 'Module did not self-register' }),
      spawn: () => ({ status: 0 }),
      env: {},
    })).toThrow('auch nach dem Node-Rebuild nicht lauffähig');
  });
});
