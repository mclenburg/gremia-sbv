const { readdirSync, readFileSync } = require('node:fs');
const { join, relative, sep } = require('node:path');

function normalizePath(value) {
  return value.split(sep).join('/');
}

function loadGroupConfig(root = process.cwd()) {
  return JSON.parse(readFileSync(join(root, 'maintenance/test-quality/test-suite-groups.json'), 'utf8'));
}

function listTestFiles(root = process.cwd()) {
  const testsDir = join(root, 'tests');
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const absolute = join(dir, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && /\.test\.[cm]?[jt]sx?$/.test(entry.name)) files.push(normalizePath(relative(root, absolute)));
    }
  }
  walk(testsDir);
  return files.sort();
}

function classifyTestFiles(root = process.cwd()) {
  const config = loadGroupConfig(root);
  const assignments = Object.fromEntries(config.precedence.map((group) => [group, []]));
  const compiled = Object.fromEntries(Object.entries(config.groups).map(([group, value]) => [
    group,
    value.patterns.map((pattern) => new RegExp(pattern, 'i'))
  ]));

  for (const file of listTestFiles(root)) {
    const fileName = file.slice(file.lastIndexOf('/') + 1);
    const domainGroup = file === 'tests/platform/demo/demoModeBehavior.test.ts'
      ? 'security'
      : file.startsWith('tests/security/') || file.startsWith('tests/privacy/')
        ? 'security'
        : file.startsWith('tests/architecture/') || file.startsWith('tests/platform/')
          ? 'architecture'
          : null;
    const group = domainGroup ?? config.precedence.find((candidate) => compiled[candidate].some((pattern) => pattern.test(fileName)));
    if (!group) throw new Error(`Keine Testgruppe für ${file}`);
    assignments[group].push(file);
  }
  return { config, assignments };
}

module.exports = { classifyTestFiles, listTestFiles, loadGroupConfig };
