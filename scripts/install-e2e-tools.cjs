#!/usr/bin/env node
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');
const { e2eToolsDir } = require('./e2e-tools.cjs');

const E2E_PACKAGES = [
  '@playwright/test@1.59.1',
  '@axe-core/playwright@4.10.2',
];

function resolveNpmInvocation() {
  if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
    return {
      command: process.execPath,
      argsPrefix: [process.env.npm_execpath],
      label: `${process.execPath} ${process.env.npm_execpath}`,
      shell: false,
    };
  }

  return {
    command: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    argsPrefix: [],
    label: process.platform === 'win32' ? 'npm.cmd' : 'npm',
    shell: process.platform === 'win32',
  };
}

function runNpmInstall(toolsDir) {
  const npm = resolveNpmInvocation();
  const args = [
    ...npm.argsPrefix,
    'install',
    '--no-save',
    '--no-package-lock',
    '--ignore-scripts',
    ...E2E_PACKAGES,
  ];

  console.log(`E2E-Werkzeuginstallation: ${npm.label} ${args.slice(npm.argsPrefix.length).join(' ')}`);
  const result = spawnSync(npm.command, args, {
    cwd: toolsDir,
    stdio: 'inherit',
    shell: npm.shell,
    env: {
      ...process.env,
      npm_config_package_lock: 'false',
      npm_config_save: 'false',
      npm_config_workspaces: 'false',
      npm_config_include_workspace_root: 'false',
    },
  });

  if (result.error) {
    console.error(`E2E-Werkzeuginstallation konnte npm nicht starten: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

const toolsDir = e2eToolsDir();
mkdirSync(toolsDir, { recursive: true });
writeFileSync(
  join(toolsDir, 'package.json'),
  `${JSON.stringify({ private: true, name: 'gremia-sbv-e2e-tools' }, null, 2)}\n`,
  'utf8',
);

console.log(`Installiere E2E-Werkzeuge isoliert nach ${toolsDir}`);
console.log('Die Pakete werden bewusst nicht in package.json, package-lock.json oder node_modules des App-Projekts eingetragen.');
console.log(`Node: ${process.version} | Plattform: ${process.platform} ${process.arch}`);

runNpmInstall(toolsDir);
