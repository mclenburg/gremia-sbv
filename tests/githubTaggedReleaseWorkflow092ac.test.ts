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

  it('trennt schnelle Qualitätsgates vom plattformspezifischen Artefaktbau', () => {
    expect(taggedReleaseWorkflow).toContain('quality-gates:');
    expect(taggedReleaseWorkflow).toContain('npm run release:check');
    expect(taggedReleaseWorkflow).not.toContain('npm run test:e2e:setup');
    expect(taggedReleaseWorkflow).not.toContain('npm run test:e2e:visual');
    expect(taggedReleaseWorkflow).not.toContain('npm run test:e2e:core-ui-flows');
    expect(taggedReleaseWorkflow).not.toContain('npm run test:e2e:complete-tour');
    expect(taggedReleaseWorkflow).not.toContain('npm run test:e2e:a11y');
    expect(taggedReleaseWorkflow).toContain('build-artifacts:');
    expect(taggedReleaseWorkflow).toContain('- quality-gates');
  });

  it('baut Linux und Windows auf dem jeweiligen Zielsystem und veröffentlicht nur vorhandene Artefakte', () => {
    expect(taggedReleaseWorkflow).toContain('build_script: build:linux');
    expect(taggedReleaseWorkflow).toContain('build_script: build:win');
    expect(taggedReleaseWorkflow).toContain('release/*.AppImage');
    expect(taggedReleaseWorkflow).toContain('release/*.exe');
    expect(taggedReleaseWorkflow).not.toContain('build_script: build:mac');
    expect(taggedReleaseWorkflow).not.toContain('macos-latest');
    expect(taggedReleaseWorkflow).not.toContain('release/*.dmg');
    expect(taggedReleaseWorkflow).toContain('prepare-release:');
    expect(taggedReleaseWorkflow).toContain('GH_REPO: ${{ github.repository }}');
    expect(taggedReleaseWorkflow).toContain('gh release view "${GITHUB_REF_NAME}" --repo "${GH_REPO}"');
    expect(taggedReleaseWorkflow).toContain('--repo "${GH_REPO}"');
    expect(taggedReleaseWorkflow).toContain('gh release create "${release_args[@]}"');
    expect(taggedReleaseWorkflow).toContain('fail_on_unmatched_files: true');
    expect(taggedReleaseWorkflow).toContain('Upload platform asset directly to draft release');
    expect(uses(taggedReleaseWorkflow, 'softprops/action-gh-release@v2')).toBe(true);
  });

  it('nutzt den bestehenden Node-24-Kompatibilitätsvertrag der Repository-Tests', () => {
    expect(taggedReleaseWorkflow).toContain('FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"');

    for (const workflow of [taggedReleaseWorkflow, signPathWorkflow]) {
      expect(uses(workflow, 'actions/checkout@v4')).toBe(true);
      expect(uses(workflow, 'actions/setup-node@v4')).toBe(true);
      expect(workflow).not.toContain('actions/checkout@v5');
      expect(workflow).not.toContain('actions/setup-node@v6');
      expect(workflow).not.toContain('actions/upload-artifact@v7');
    }

    expect(uses(taggedReleaseWorkflow, 'actions/upload-artifact@v4')).toBe(false);
    expect(uses(taggedReleaseWorkflow, 'actions/download-artifact@v4')).toBe(false);
    expect(uses(signPathWorkflow, 'actions/upload-artifact@v4')).toBe(true);
  });


  it('vermeidet dauerhafte Workflow-Artefakte im normalen taggebundenen Release-Build', () => {
    expect(taggedReleaseWorkflow).not.toContain('Upload workflow artifact');
    expect(taggedReleaseWorkflow).not.toContain('Download platform artifacts');
    expect(taggedReleaseWorkflow).not.toContain('actions/upload-artifact@v4');
    expect(taggedReleaseWorkflow).not.toContain('actions/download-artifact@v4');
    expect(taggedReleaseWorkflow).toContain('Upload platform asset directly to draft release');
    expect(taggedReleaseWorkflow).toContain('softprops/action-gh-release@v2');
    expect(taggedReleaseWorkflow).toContain('fail_on_unmatched_files: true');
  });


  it('spart GitHub-Free-Ressourcen durch direkte Release-Assets und ohne E2E-/macOS-Ballast', () => {
    expect(taggedReleaseWorkflow).not.toContain('GREMIA_SBV_E2E_USE_SYSTEM_CHROME');
    expect(taggedReleaseWorkflow).not.toContain('PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD');
    expect(taggedReleaseWorkflow).not.toContain('test:e2e:setup');
    expect(taggedReleaseWorkflow).not.toContain('test:e2e:visual');
    expect(taggedReleaseWorkflow).not.toContain('test:e2e:core-ui-flows');
    expect(taggedReleaseWorkflow).not.toContain('test:e2e:complete-tour');
    expect(taggedReleaseWorkflow).not.toContain('test:e2e:a11y');
    expect(taggedReleaseWorkflow).not.toContain('actions/upload-artifact@v4');
    expect(taggedReleaseWorkflow).not.toContain('actions/download-artifact@v4');
    expect(taggedReleaseWorkflow).not.toContain('macos-latest');
    expect(taggedReleaseWorkflow).not.toContain('build_script: build:mac');
    expect(taggedReleaseWorkflow).not.toContain('release/*.dmg');
  });

  it('bietet einen gezielten lokalen Regressionstest für die Workflow-Verträge an', () => {
    expect(packageJson.scripts['test:github-actions']).toBe('vitest run tests/githubTaggedReleaseWorkflow092ac.test.ts tests/signpathCodeSigning092u.test.ts');
  });
});
