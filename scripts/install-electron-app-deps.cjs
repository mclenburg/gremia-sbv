#!/usr/bin/env node
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');

function createSanitizedEnv(sourceEnv = process.env) {
  const env = { ...sourceEnv };
  for (const key of Object.keys(env)) {
    const normalized = key.toLowerCase();
    if (
      normalized.startsWith('npm_config_workspace') ||
      normalized === 'npm_config_workspaces' ||
      normalized === 'npm_config_include_workspace_root' ||
      normalized === 'npm_execpath' ||
      normalized === 'npm_node_execpath' ||
      normalized === 'npm_command'
    ) {
      delete env[key];
    }
  }

  // npm liest Workspace-Optionen nicht nur aus der Prozessumgebung, sondern auch aus
  // npm-Konfigurationen. Ein bloßes Löschen der Lifecycle-Variablen reicht deshalb nicht,
  // wenn npm später intern erneut als Kindprozess gestartet wird. Leere Werte übersteuern
  // sowohl npm-Lifecycle-Flags als auch ggf. gesetzte Benutzerkonfigurationen, ohne ein
  // aktives --workspace/--workspaces-Flag zu erzeugen.
  env.npm_config_workspace = '';
  env.npm_config_workspaces = '';
  env.npm_config_include_workspace_root = '';
  env.NPM_CONFIG_WORKSPACE = '';
  env.NPM_CONFIG_WORKSPACES = '';
  env.NPM_CONFIG_INCLUDE_WORKSPACE_ROOT = '';

  return env;
}

function resolveElectronBuilderCli(cwd = process.cwd()) {
  const requireFromProject = createRequire(path.join(cwd, 'package.json'));
  const candidates = [
    'electron-builder/out/cli/cli.js',
    'electron-builder/cli.js',
  ];

  for (const candidate of candidates) {
    try {
      return requireFromProject.resolve(candidate);
    } catch (_) {
      // Kandidat existiert in dieser electron-builder-Version nicht.
    }
  }

  throw new Error('electron-builder CLI wurde nicht in node_modules gefunden');
}

function runInstallAppDeps(spawn = spawnSync, envSource = process.env, options = {}) {
  let cliPath;
  try {
    cliPath = (options.resolveElectronBuilderCli ?? resolveElectronBuilderCli)(process.cwd());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`electron-builder install-app-deps konnte nicht vorbereitet werden: ${message}`);
    return 1;
  }

  const result = spawn(process.execPath, [cliPath, 'install-app-deps'], {
    cwd: process.cwd(),
    env: createSanitizedEnv(envSource),
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    console.error(`electron-builder install-app-deps konnte nicht gestartet werden: ${result.error.message}`);
    return 1;
  }
  return typeof result.status === 'number' ? result.status : 1;
}

if (require.main === module) {
  process.exitCode = runInstallAppDeps();
}

module.exports = { createSanitizedEnv, resolveElectronBuilderCli, runInstallAppDeps };
