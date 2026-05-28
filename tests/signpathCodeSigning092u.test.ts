import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const signPathReadiness = require('../scripts/check-signpath-readiness.cjs') as {
  missingRequiredEnvironment(env: Record<string, string>): string[];
  validateArtifactConfiguration(source: string): { ok: boolean; signsExe: boolean; doesNotSignUnexpectedContainers: boolean };
  validateReadiness(input: {
    env?: Record<string, string>;
    workflowText: string;
    artifactConfigurationText: string;
    checkEnvironment?: boolean;
  }): { ok: boolean; missingEnvironment: string[]; workflow: { ok: boolean; hasAutomaticTrigger: boolean } };
  validateWorkflowContract(source: string): { ok: boolean; hasManualTrigger: boolean; hasAutomaticTrigger: boolean; isExplicitlyGated: boolean };
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
