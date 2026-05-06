import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  version: string;
  scripts: Record<string, string>;
};
const renderSource = readFileSync('src/app/features/cases/CasesViewRender.tsx', 'utf8');
const casesViewSource = readFileSync('src/app/features/cases/CasesView.tsx', 'utf8');

describe('0.8.11-d build integration hardening', () => {
  it('keeps prebuild compatible with the readiness guard and runs Vitest inside the normal build command', () => {
    expect(packageJson.version).toMatch(/^0\.8\.(11|12)(?:-[a-z0-9.]+)?$/);
    expect(packageJson.scripts.prebuild).toBe('npm run version:generate && npm run source:cleanup && npm run build:readiness');
    expect(packageJson.scripts.build).toContain('npm run test && tsc -p tsconfig.json');
  });

  it('passes register paging and process creation handlers into the render module', () => {
    expect(casesViewSource).toContain('caseRegisterPageSize');
    expect(casesViewSource).toContain('openCaseProcessDraft');
    expect(renderSource).toContain('caseRegisterPageSize');
    expect(renderSource).toContain('openCaseProcessDraft');
    expect(renderSource).toContain('pageSize={caseRegisterPageSize}');
    expect(renderSource).toContain('onProcess={openCaseProcessDraft}');
  });
});
