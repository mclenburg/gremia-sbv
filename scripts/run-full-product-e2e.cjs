#!/usr/bin/env node
const { existsSync, mkdtempSync, rmSync, readdirSync, statSync } = require('node:fs');
const { join, resolve, delimiter } = require('node:path');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const { resolvePlaywrightRunner } = require('./run-e2e.cjs');

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: 'inherit', shell: false, env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function npmRun(script) {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  run(npm, ['run', script]);
}

function findExecutable() {
  const releaseDir = join(process.cwd(), 'release');
  const candidates = process.platform === 'win32'
    ? [join(releaseDir, 'win-unpacked', 'Gremia.SBV.exe')]
    : process.platform === 'darwin'
      ? [join(releaseDir, 'mac', 'Gremia.SBV.app', 'Contents', 'MacOS', 'Gremia.SBV')]
      : [join(releaseDir, 'linux-unpacked', 'gremia-sbv'), join(releaseDir, 'linux-unpacked', 'Gremia.SBV')];
  const exact = candidates.find((candidate) => existsSync(candidate));
  if (exact) return exact;
  if (!existsSync(releaseDir)) return null;
  const stack = [releaseDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of readdirSync(current)) {
      const candidate = join(current, entry);
      const stat = statSync(candidate);
      if (stat.isDirectory()) stack.push(candidate);
      else if ((process.platform === 'win32' && entry.toLowerCase().endsWith('.exe')) || (process.platform !== 'win32' && /gremia[.-]?sbv/i.test(entry) && (stat.mode & 0o111))) return candidate;
    }
  }
  return null;
}

const keepData = process.argv.includes('--keep-data');
const reuseBuild = process.argv.includes('--reuse-build');
const passThrough = process.argv.slice(2).filter((arg) => !['--keep-data', '--reuse-build'].includes(arg));

if (!reuseBuild) {
  npmRun('build:compile');
  npmRun('native:rebuild:electron');
  const builderArgs = process.platform === 'win32' ? ['--win', '--dir'] : process.platform === 'darwin' ? ['--mac', '--dir'] : ['--linux', '--dir'];
  run(process.execPath, ['scripts/run-electron-builder.cjs', ...builderArgs]);
}

const executable = findExecutable();
if (!executable) {
  console.error('Full-Product-E2E-Abbruch: gepackte ausführbare Anwendung wurde unter release/ nicht gefunden.');
  process.exit(3);
}

const runner = resolvePlaywrightRunner();
if (!runner) {
  console.error('Full-Product-E2E-Abbruch: Playwright-Werkzeuge fehlen. Zuerst npm run test:e2e:setup ausführen.');
  process.exit(4);
}

const root = mkdtempSync(join(tmpdir(), 'gremia-sbv-full-product-e2e-'));
const e2eNodeModules = join(process.cwd(), '.e2e-tools', 'node_modules');
const env = {
  ...process.env,
  NODE_PATH: [e2eNodeModules, process.env.NODE_PATH].filter(Boolean).join(delimiter),
  GREMIA_SBV_E2E: '1',
  GREMIA_SBV_PRODUCT_EXECUTABLE: resolve(executable),
  GREMIA_SBV_FULL_E2E_ROOT: root,
  GREMIA_SBV_FULL_E2E_WORKERS: process.env.GREMIA_SBV_FULL_E2E_WORKERS || '2',
  PLAYWRIGHT_HTML_REPORT: join(root, 'playwright-report'),
  PLAYWRIGHT_TEST_OUTPUT_DIR: join(root, 'playwright-output'),
};

console.log(`Full-Product-E2E: ${executable}`);
console.log(`Isolierte Testdaten: ${root}`);
console.log(`Worker: ${env.GREMIA_SBV_FULL_E2E_WORKERS} (maximal 2 gleichzeitig, je ein persistenter Test-Tresor pro parallelem Slot)`);
const status = spawnSync(runner.command, [...runner.argsPrefix, 'test', '--config', 'playwright.product.config.ts', ...passThrough], { stdio: 'inherit', shell: false, env }).status ?? 1;
if (keepData || status !== 0) {
  console.log(`Full-Product-E2E-Daten beibehalten: ${root}`);
  if (status !== 0) {
    console.log('Fehlerartefakte: Screenshots, Videos, Traces und Fehlerkontexte liegen unter playwright-output/.');
  }
} else {
  rmSync(root, { recursive: true, force: true });
}
process.exit(status);
