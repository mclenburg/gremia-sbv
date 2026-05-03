#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const dryRun = process.argv.includes('--dry-run');
const root = process.cwd();

const targets = [
  'docs/GREMIA_BR_INTERFACE.md',
  'services/gremiaBrReadAdapter.ts',
  'docs/BUILD_FIX_0_4_10.md',
  'docs/BUILD_FIX_0_4_25_PROCESS_TEMPLATES.md',
  'docs/BRIDGE_CONTRACT_FIX.md',
  'docs/ESM_CJS_ELECTRON_FIX.md',
  'docs/FIRST_START_FIX.md',
  'docs/REPORT_PDF_ELECTRON_BUILD_FIX.md',
  'docs/REPORT_PDF_PRINT_OPTIONS_FIX.md',
  'docs/PREVENTION_DEEPLINK_HOOK_FIX_0_4_33.md',
  'docs/PREVENTION_DEEPLINK_SCOPE_FIX_0_4_34.md',
  'docs/PREVENTION_DEEPLINK_APP_SCOPE_FIX_0_4_35.md',
  'docs/PROCESS_TEMPLATE_BUILD_FIX_0_4_27.md',
  'docs/PROVIDER_WRAPPING_FIX_0_4_39.md',
  'docs/WORKFLOW_MISSING_HELPERS_FIX_0_4_42A.md',
  'docs/PREVENTION_FEATURE_IMPORT_FIX_0_4_41.md'
];

let removed = 0;
for (const relativePath of targets) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  if (dryRun) {
    console.log(`[dry-run] remove ${relativePath}`);
  } else {
    fs.rmSync(absolutePath, { force: true });
    console.log(`removed ${relativePath}`);
  }
  removed += 1;
}

if (removed === 0) {
  console.log('No legacy artifacts found.');
} else if (dryRun) {
  console.log(`${removed} legacy artifact(s) would be removed.`);
} else {
  console.log(`${removed} legacy artifact(s) removed.`);
}
