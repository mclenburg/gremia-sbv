import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const taggedReleaseWorkflow = readFileSync('.github/workflows/build-release.yml', 'utf8');
const signPathWorkflow = readFileSync('.github/workflows/signpath-windows-exe.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };

function uses(workflow: string, action: string): boolean {
  return workflow.includes(`uses: ${action}`);
}

describe('Taggebundener GitHub-Release-Build 0.9.2', () => {
  it('läuft ausschließlich für Versions-Tags und schützt parallele Releases pro Tag', () => {
    expect(taggedReleaseWorkflow).toContain('tags:');
    expect(taggedReleaseWorkflow).toContain('- "v*"');
    expect(taggedReleaseWorkflow).toContain('group: tagged-release-${{ github.ref }}');
    expect(taggedReleaseWorkflow).toContain('cancel-in-progress: false');
  });

  it('prüft die Tag-Version zentral, bevor Tests oder Paketbau starten', () => {
    expect(taggedReleaseWorkflow).toContain('verify-tag:');
    expect(taggedReleaseWorkflow).toContain('package_version="$(node -p "require(\'./package.json\').version")"');
    expect(taggedReleaseWorkflow).toContain('tag_version="${GITHUB_REF_NAME#v}"');
    expect(taggedReleaseWorkflow).toContain('Tag version ${tag_version} does not match package.json version ${package_version}');
    expect(taggedReleaseWorkflow).toContain('needs: verify-tag');
  });

  it('trennt Qualitätsgates vom plattformspezifischen Artefaktbau', () => {
    expect(taggedReleaseWorkflow).toContain('quality-gates:');
    expect(taggedReleaseWorkflow).toContain('npm run release:check');
    expect(taggedReleaseWorkflow).toContain('npm run test:e2e:visual');
    expect(taggedReleaseWorkflow).toContain('npm run test:e2e:core-ui-flows');
    expect(taggedReleaseWorkflow).toContain('npm run test:e2e:complete-tour');
    expect(taggedReleaseWorkflow).toContain('npm run test:e2e:a11y');
    expect(taggedReleaseWorkflow).toContain('build-artifacts:');
    expect(taggedReleaseWorkflow).toContain('- quality-gates');
  });

  it('baut Linux und Windows auf dem jeweiligen Zielsystem und veröffentlicht nur vorhandene Artefakte', () => {
    expect(taggedReleaseWorkflow).toContain('build_script: build:linux');
    expect(taggedReleaseWorkflow).toContain('build_script: build:win');
    expect(taggedReleaseWorkflow).toContain('release/*.AppImage');
    expect(taggedReleaseWorkflow).toContain('release/*.exe');
    expect(taggedReleaseWorkflow).toContain('if-no-files-found: error');
    expect(taggedReleaseWorkflow).toContain('publish-release:');
    expect(uses(taggedReleaseWorkflow, 'actions/download-artifact@v8')).toBe(true);
    expect(uses(taggedReleaseWorkflow, 'softprops/action-gh-release@v3')).toBe(true);
  });

  it('verwendet Node-24-kompatible GitHub-Actions ohne FORCE_JAVASCRIPT_ACTIONS_TO_NODE24-Hack', () => {
    for (const workflow of [taggedReleaseWorkflow, signPathWorkflow]) {
      expect(uses(workflow, 'actions/checkout@v5')).toBe(true);
      expect(uses(workflow, 'actions/setup-node@v6')).toBe(true);
      expect(workflow).not.toContain('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24');
      expect(workflow).not.toContain('actions/checkout@v4');
      expect(workflow).not.toContain('actions/setup-node@v4');
      expect(workflow).not.toContain('actions/upload-artifact@v7');
    }

    expect(uses(taggedReleaseWorkflow, 'actions/upload-artifact@v6')).toBe(true);
    expect(uses(taggedReleaseWorkflow, 'actions/download-artifact@v8')).toBe(true);
    expect(uses(signPathWorkflow, 'actions/upload-artifact@v6')).toBe(true);
  });

  it('bietet einen gezielten lokalen Regressionstest für die Workflow-Verträge an', () => {
    expect(packageJson.scripts['test:github-actions']).toBe('vitest run tests/githubTaggedReleaseWorkflow092ac.test.ts tests/signpathCodeSigning092u.test.ts');
  });
});
