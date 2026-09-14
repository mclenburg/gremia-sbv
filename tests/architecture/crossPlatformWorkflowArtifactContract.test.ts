import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as { load(source: string): Record<string, unknown> };
const root = process.cwd();

type WorkflowStep = {
  name?: string;
  if?: string;
  run?: string;
  uses?: string;
  with?: Record<string, unknown>;
};

function crossPlatformSteps(): WorkflowStep[] {
  const workflow = yaml.load(
    readFileSync(path.join(root, '.github/workflows/cross-platform-release-verification.yml'), 'utf8'),
  ) as { jobs?: { 'verify-platform'?: { steps?: WorkflowStep[] } } };
  return workflow.jobs?.['verify-platform']?.steps ?? [];
}

describe('Cross-Platform-Workflow-Artefaktvertrag', () => {
  it('baut im Pull Request Windows portable-only ohne MSI/WiX-Target', () => {
    const windowsPrPackaging = crossPlatformSteps().find(
      (step) => step.name === 'Package Windows portable EXE for pull requests',
    );
    const windowsPrCheck = crossPlatformSteps().find(
      (step) => step.name === 'Run Windows portable startup and path/backup checks for pull requests',
    );

    expect(windowsPrPackaging?.if).toContain("github.event_name == 'pull_request'");
    expect(windowsPrPackaging?.run).toBe('npm run build:package:windows-portable');
    expect(windowsPrCheck?.if).toContain("github.event_name == 'pull_request'");
    expect(windowsPrCheck?.run).toBe('npm run release:platform:windows-portable');
  });

  it('baut und veröffentlicht beim manuellen Windows-Artefaktlauf portable EXE und MSI', () => {
    const manualWindowsPackaging = crossPlatformSteps().find(
      (step) => step.name === 'Package Windows portable EXE + MSI for manual artifact refresh',
    );
    const manualWindowsCheck = crossPlatformSteps().find(
      (step) => step.name === 'Run Windows release artifact, startup and path/backup checks for manual artifact refresh',
    );
    const upload = crossPlatformSteps().find((step) => step.name === 'Upload verified release artifact');

    expect(manualWindowsPackaging?.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(manualWindowsPackaging?.run).toBe('npm run build:package:windows');
    expect(manualWindowsCheck?.if).toContain("github.event_name == 'workflow_dispatch'");
    expect(manualWindowsCheck?.run).toBe('npm run release:platform:windows');
    expect(String(upload?.with?.path)).toContain('release/*.msi');
  });
});
