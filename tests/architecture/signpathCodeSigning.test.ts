import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const yaml = require('js-yaml') as { load(source: string): Record<string, unknown>; dump(value: unknown): string };
const signPathReadiness = require('../../scripts/check-signpath-readiness.cjs') as {
  missingRequiredEnvironment(env: Record<string, string>): string[];
  validateArtifactConfiguration(source: string): { ok: boolean; signsExe: boolean; doesNotSignUnexpectedContainers: boolean };
  validateReadiness(input: {
    env?: Record<string, string>;
    workflowText: string;
    artifactConfigurationText: string;
    checkEnvironment?: boolean;
  }): { ok: boolean; missingEnvironment: string[]; workflow: { ok: boolean; hasAutomaticTrigger: boolean } };
  validateWorkflowContract(source: string): {
    ok: boolean;
    hasManualTrigger: boolean;
    hasAutomaticTrigger: boolean;
    isExplicitlyGated: boolean;
    buildAndSigningSeparated: boolean;
    secretIsStepScoped: boolean;
    actionsPinned: boolean;
  };
};

function projectFile(...segments: string[]): string {
  return readFileSync(join(...segments), 'utf8');
}

describe('SignPath-Code-Signatur Vorbereitung 0.9.2', () => {
  const workflow = projectFile('.github', 'workflows', 'signpath-windows-exe.yml');
  const artifactConfiguration = projectFile('.signpath', 'artifact-configurations', 'windows-exe.xml');

  it('hält den SignPath-Workflow kostenneutral, bis er bewusst manuell freigeschaltet wird', () => {
    const contract = signPathReadiness.validateWorkflowContract(workflow);

    expect(contract.hasManualTrigger).toBe(true);
    expect(contract.hasAutomaticTrigger).toBe(false);
    expect(contract.isExplicitlyGated).toBe(true);
    expect(contract.ok).toBe(true);
  });

  it('isoliert den SignPath-Schlüssel vom Build und pinnt alle Actions unveränderlich', () => {
    const contract = signPathReadiness.validateWorkflowContract(workflow);

    expect(contract.buildAndSigningSeparated).toBe(true);
    expect(contract.secretIsStepScoped).toBe(true);
    expect(contract.actionsPinned).toBe(true);
  });

  it('weist einen auf Job-Ebene verfügbaren SignPath-Schlüssel zurück', () => {
    const unsafe = yaml.load(workflow) as {
      jobs: Record<string, { env?: Record<string, string>; steps: Array<{ uses?: string; with?: Record<string, string> }> }>;
    };
    const signingJob = unsafe.jobs['signpath-windows-exe'];
    const submitStep = signingJob.steps.find((step) => step.uses?.startsWith('signpath/github-action-submit-signing-request@'));
    signingJob.env = { ...signingJob.env, SIGNPATH_API_TOKEN: '${{ secrets.SIGNPATH_API_TOKEN }}' };
    if (submitStep?.with) delete submitStep.with['api-token'];

    const contract = signPathReadiness.validateWorkflowContract(yaml.dump(unsafe));

    expect(contract.secretIsStepScoped).toBe(false);
    expect(contract.ok).toBe(false);
  });

  it('signiert nur die für Release-Artefakte vorbereiteten Windows-EXE-Dateien', () => {
    const contract = signPathReadiness.validateArtifactConfiguration(artifactConfiguration);

    expect(contract.signsExe).toBe(true);
    expect(contract.doesNotSignUnexpectedContainers).toBe(true);
    expect(contract.ok).toBe(true);
  });

  it('erkennt fehlende SignPath-Zugangsdaten, ohne sie im Repository zu hinterlegen', () => {
    const missing = signPathReadiness.missingRequiredEnvironment({
      SIGNPATH_API_TOKEN: 'token',
      SIGNPATH_ORGANIZATION_ID: 'organization',
      SIGNPATH_PROJECT_SLUG: 'gremia-sbv',
      SIGNPATH_SIGNING_POLICY_SLUG: '',
    });

    expect(missing).toEqual(['SIGNPATH_SIGNING_POLICY_SLUG']);
  });

  it('meldet die vorbereitete Konfiguration erst mit vollständiger Umgebung als freischaltbar', () => {
    const result = signPathReadiness.validateReadiness({
      workflowText: workflow,
      artifactConfigurationText: artifactConfiguration,
      checkEnvironment: true,
      env: {
        SIGNPATH_API_TOKEN: 'token',
        SIGNPATH_ORGANIZATION_ID: 'organization',
        SIGNPATH_PROJECT_SLUG: 'gremia-sbv',
        SIGNPATH_SIGNING_POLICY_SLUG: 'release-signing',
      },
    });

    expect(result.missingEnvironment).toEqual([]);
    expect(result.workflow.hasAutomaticTrigger).toBe(false);
    expect(result.ok).toBe(true);
  });
});
