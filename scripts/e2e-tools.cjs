const { existsSync } = require('node:fs');
const { join } = require('node:path');

const E2E_TOOLS_DIR = '.e2e-tools';

function e2eToolsDir(root = process.cwd()) {
  return join(root, E2E_TOOLS_DIR);
}

function e2eBin(name, root = process.cwd()) {
  return process.platform === 'win32'
    ? join(e2eToolsDir(root), 'node_modules', '.bin', `${name}.cmd`)
    : join(e2eToolsDir(root), 'node_modules', '.bin', name);
}

function hasE2eTool(name, root = process.cwd()) {
  return existsSync(e2eBin(name, root));
}

module.exports = {
  E2E_TOOLS_DIR,
  e2eToolsDir,
  e2eBin,
  hasE2eTool,
};
