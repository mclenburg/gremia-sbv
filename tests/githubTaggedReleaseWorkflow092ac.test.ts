import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const taggedReleaseWorkflow = readFileSync(".github/workflows/build-release.yml", "utf8");
const signPathWorkflow = readFileSync(".github/workflows/signpath-windows-exe.yml", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };

function includesAll(value: string, required: string[]): boolean {
  return required.every((entry) => value.includes(entry));
}

function includesNone(value: string, forbidden: string[]): boolean {
  return forbidden.every((entry) => !value.includes(entry));
}

function inspectTaggedReleaseWorkflow(workflow: string) {
  const releaseGateSteps = packageJson.scripts["release:check"].split("&&").map((step) => step.trim());
  const requiredReleaseSteps = [
    "npm run rc:check",
    "npm run release:check:backup-restore",
    "npm run test:quality-check",
    "npm run type-safety:any-check",
    "npm run lint",
    "npm run test:coverage",
    "npm run build:app",
  ];
  const releaseStepsOrdered = requiredReleaseSteps.every((step, index) => {
    const position = releaseGateSteps.indexOf(step);
    const previous = index === 0 ? -1 : releaseGateSteps.indexOf(requiredReleaseSteps[index - 1]);
    return position > previous;
  });

  return {
    tagTriggerAndConcurrency: includesAll(workflow, ["tags:", '- "v*"', "group: tagged-release-${{ github.ref }}", "cancel-in-progress: false"]),
    tagVersionGuard: includesAll(workflow, [
      "verify-tag:",
      "package_version=\"$(node -p \"require('./package.json').version\")\"",
      'tag_version="${GITHUB_REF_NAME#v}"',
      "does not match package.json version",
      "needs: verify-tag",
    ]),
    qualityAndArtifactSeparation: includesAll(workflow, ["quality-gates:", "npm run release:check", "build-artifacts:", "- quality-gates"]),
    supportedPlatforms: includesAll(workflow, ["build_script: build:linux", "build_script: build:win", "release/*.AppImage", "release/*.exe"]),
    unsupportedPlatformsAbsent: includesNone(workflow, ["build_script: build:mac", "macos-latest", "release/*.dmg"]),
    directDraftReleaseUpload: includesAll(workflow, [
      "prepare-release:",
      "GH_REPO: ${{ github.repository }}",
      "gh release view",
      "gh release create",
      "softprops/action-gh-release@v2",
      "fail_on_unmatched_files: true",
      "Upload platform asset directly to draft release",
    ]),
    noWorkflowArtifactRoundtrip: includesNone(workflow, [
      "Upload workflow artifact",
      "Download platform artifacts",
      "actions/upload-artifact@v4",
      "actions/download-artifact@v4",
    ]),
    noE2eInPackagingWorkflow: includesNone(workflow, [
      "test:e2e:setup",
      "test:e2e:visual",
      "test:e2e:core-ui-flows",
      "test:e2e:complete-tour",
      "test:e2e:a11y",
      "GREMIA_SBV_E2E_USE_SYSTEM_CHROME",
      "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD",
    ]),
    node24Compatibility: includesAll(workflow, [
      'FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: "true"',
      "actions/checkout@v4",
      "actions/setup-node@v4",
    ]) && includesAll(signPathWorkflow, ["actions/checkout@v4", "actions/setup-node@v4", "actions/upload-artifact@v4"]),
    unsupportedActionMajorsAbsent: includesNone(`${workflow}\n${signPathWorkflow}`, [
      "actions/checkout@v5",
      "actions/setup-node@v6",
      "actions/upload-artifact@v7",
    ]),
    releaseStepsOrdered,
    appBuildDoesNotRepeatTests: packageJson.scripts.build === "npm run test && npm run build:app"
      && packageJson.scripts["build:app"].includes("vite build")
      && !packageJson.scripts["build:app"].includes("vitest run")
      && !packageJson.scripts["build:app"].includes("npm run test:coverage"),
    targetedRegressionScript: packageJson.scripts["test:github-actions"] === "vitest run tests/githubTaggedReleaseWorkflow092ac.test.ts tests/signpathCodeSigning092u.test.ts",
  };
}

describe("Taggebundener GitHub-Release-Build", () => {
  it("erfüllt den vollständigen semantischen Releasevertrag", () => {
    expect(inspectTaggedReleaseWorkflow(taggedReleaseWorkflow)).toEqual({
      tagTriggerAndConcurrency: true,
      tagVersionGuard: true,
      qualityAndArtifactSeparation: true,
      supportedPlatforms: true,
      unsupportedPlatformsAbsent: true,
      directDraftReleaseUpload: true,
      noWorkflowArtifactRoundtrip: true,
      noE2eInPackagingWorkflow: true,
      node24Compatibility: true,
      unsupportedActionMajorsAbsent: true,
      releaseStepsOrdered: true,
      appBuildDoesNotRepeatTests: true,
      targetedRegressionScript: true,
    });
  });
});
