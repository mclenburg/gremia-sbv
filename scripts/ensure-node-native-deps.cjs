#!/usr/bin/env node
const { spawnSync } = require('node:child_process');

const NATIVE_PACKAGE = 'better-sqlite3-multiple-ciphers';
const REBUILD_SCRIPT = 'native:rebuild:node';

const PROBE_SOURCE = `
const candidate = require(${JSON.stringify(NATIVE_PACKAGE)});
const Database = candidate && candidate.default ? candidate.default : candidate;
if (typeof Database !== 'function') {
  throw new TypeError(${JSON.stringify(NATIVE_PACKAGE + ' exportiert keinen Datenbank-Konstruktor.')});
}
const db = new Database(':memory:');
try {
  db.prepare('SELECT 1 AS value').get();
} finally {
  db.close();
}
`;

function nativeFailureMessage(result) {
  return [result?.stderr, result?.stdout, result?.error?.message]
    .filter(Boolean)
    .map(String)
    .join('\n')
    .trim();
}

function isNativeAbiFailure(error) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  return /NODE_MODULE_VERSION|Module did not self-register|invalid ELF header|not a valid Win32 application|dlopen/i.test(message);
}

function sanitizedNodeRebuildEnv(sourceEnv = process.env) {
  const env = { ...sourceEnv };
  const forbidden = new Set([
    'npm_config_runtime',
    'npm_config_target',
    'npm_config_disturl',
    'npm_config_build_from_source',
    'npm_config_target_arch',
    'npm_config_arch',
  ]);
  for (const key of Object.keys(env)) {
    if (forbidden.has(key.toLowerCase())) delete env[key];
  }
  return env;
}

function probeNative(spawn = spawnSync, env = process.env) {
  return spawn(process.execPath, ['-e', PROBE_SOURCE], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });
}

function runNpmScript(script, spawn = spawnSync, env = process.env) {
  const npmExecPath = env.npm_execpath;
  const command = npmExecPath ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = npmExecPath ? [npmExecPath, 'run', script] : ['run', script];
  return spawn(command, args, {
    cwd: process.cwd(),
    env: sanitizedNodeRebuildEnv(env),
    stdio: 'inherit',
    shell: false,
  });
}

function ensureNodeNativeDeps(options = {}) {
  const spawn = options.spawn ?? spawnSync;
  const env = options.env ?? process.env;
  const probe = options.probe ?? ((probeSpawn, probeEnv) => probeNative(probeSpawn, probeEnv));

  const first = probe(spawn, env);
  if (first.status === 0) return { rebuilt: false };

  const firstMessage = nativeFailureMessage(first);
  if (!isNativeAbiFailure(firstMessage)) {
    throw new Error(firstMessage || `Native Test-Abhängigkeit ${NATIVE_PACKAGE} konnte nicht geladen werden.`);
  }

  console.log(
    `Native Test-Abhängigkeit ${NATIVE_PACKAGE} passt nicht zu Node ABI ${process.versions.modules}; ` +
    'rebuild für die aktuelle Node-Laufzeit wird ausgeführt.'
  );
  const rebuilt = runNpmScript(REBUILD_SCRIPT, spawn, env);
  if (rebuilt.status !== 0) {
    throw new Error(`Node-Rebuild der nativen Test-Abhängigkeit ist fehlgeschlagen (Exit ${rebuilt.status ?? 'unbekannt'}).`);
  }

  // Absichtlich in einem NEUEN Node-Prozess prüfen:
  // Ein bereits gestarteter Prozess kann den vor dem Rebuild geladenen nativen
  // Addon-Zustand weiterverwenden und fälschlich erneut "did not self-register"
  // melden, obwohl die Datei auf Platte inzwischen korrekt ersetzt wurde.
  const second = probe(spawn, env);
  if (second.status !== 0) {
    const secondMessage = nativeFailureMessage(second);
    throw new Error(
      `Native Test-Abhängigkeit ${NATIVE_PACKAGE} ist auch nach dem Node-Rebuild nicht lauffähig.` +
      (secondMessage ? `\n${secondMessage}` : '')
    );
  }

  return { rebuilt: true };
}

if (require.main === module) {
  try {
    ensureNodeNativeDeps();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = {
  ensureNodeNativeDeps,
  isNativeAbiFailure,
  nativeFailureMessage,
  probeNative,
  runNpmScript,
  sanitizedNodeRebuildEnv,
};
