import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { createSanitizedEnv, resolveElectronBuilderCli, runInstallAppDeps } = require('../scripts/install-electron-app-deps.cjs') as {
  createSanitizedEnv: (sourceEnv?: NodeJS.ProcessEnv) => NodeJS.ProcessEnv;
  resolveElectronBuilderCli: (cwd?: string) => string;
  runInstallAppDeps: (
    spawn: (...args: unknown[]) => { status?: number; error?: Error },
    envSource?: NodeJS.ProcessEnv,
    options?: { resolveElectronBuilderCli?: () => string },
  ) => number;
};

describe('Electron native dependency bootstrap', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('entfernt npm-Workspace-Flags und npm-Lifecycle-Exec-Kontext vor electron-builder install-app-deps', () => {
    const env = createSanitizedEnv({
      PATH: path.join('usr', 'bin'),
      npm_config_workspace: 'gremia-sbv',
      npm_config_workspaces: 'true',
      npm_config_workspace_0: 'gremia-sbv',
      NPM_CONFIG_WORKSPACES: 'true',
      npm_config_include_workspace_root: 'false',
      npm_execpath: path.join('npm', 'npm-cli.js'),
      npm_node_execpath: path.join('node', 'node'),
      npm_command: 'install',
      npm_config_user_agent: 'npm/11',
    });

    expect(env.PATH).toBe(path.join('usr', 'bin'));
    expect(env.npm_config_workspace).toBe('');
    expect(env.NPM_CONFIG_WORKSPACE).toBe('');
    expect(env.npm_config_workspace_0).toBeUndefined();
    expect(env.npm_config_workspaces).toBe('');
    expect(env.NPM_CONFIG_WORKSPACES).toBe('');
    expect(env.npm_config_include_workspace_root).toBe('');
    expect(env.NPM_CONFIG_INCLUDE_WORKSPACE_ROOT).toBe('');
    expect(env.npm_execpath).toBeUndefined();
    expect(env.npm_node_execpath).toBeUndefined();
    expect(env.npm_command).toBeUndefined();
    expect(env.npm_config_user_agent).toBe('npm/11');
  });

  it('löst die lokale electron-builder-CLI ohne npx oder npm exec auf', () => {
    const cliPath = resolveElectronBuilderCli(process.cwd());

    expect(cliPath).toContain(`node_modules${path.sep}electron-builder`);
    expect(cliPath.endsWith(`${path.sep}cli.js`) || cliPath.endsWith(`${path.sep}cli${path.sep}cli.js`)).toBe(true);
  });

  it('ruft electron-builder install-app-deps direkt über Node mit bereinigter Umgebung auf', () => {
    const calls: unknown[][] = [];
    const status = runInstallAppDeps((...args: unknown[]) => {
      calls.push(args);
      return { status: 0 };
    }, {
      npm_config_workspace: 'gremia-sbv',
      npm_execpath: path.join('npm', 'npm-cli.js'),
      npm_config_user_agent: 'npm/11',
    }, {
      resolveElectronBuilderCli: () => path.join('project', 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js'),
    });

    expect(status).toBe(0);
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(process.execPath);
    expect(calls[0][1]).toEqual([path.join('project', 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js'), 'install-app-deps']);
    expect((calls[0][2] as { env: NodeJS.ProcessEnv }).env.npm_config_workspace).toBe('');
    expect((calls[0][2] as { env: NodeJS.ProcessEnv }).env.NPM_CONFIG_WORKSPACE).toBe('');
    expect((calls[0][2] as { env: NodeJS.ProcessEnv }).env.npm_execpath).toBeUndefined();
    expect((calls[0][2] as { env: NodeJS.ProcessEnv }).env.npm_config_user_agent).toBe('npm/11');
  });

  it('meldet fehlende lokale electron-builder-CLI kontrolliert als nicht erfolgreichen Bootstrap', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const status = runInstallAppDeps(() => ({ status: 0 }), process.env, {
      resolveElectronBuilderCli: () => {
        throw new Error('nicht gefunden');
      },
    });

    expect(status).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('nicht gefunden'));
  });

  it('meldet Startfehler kontrolliert als nicht erfolgreichen Bootstrap', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const status = runInstallAppDeps(() => ({ error: new Error('node fehlt') }), process.env, {
      resolveElectronBuilderCli: () => path.join('project', 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js'),
    });

    expect(status).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('node fehlt'));
  });
});
