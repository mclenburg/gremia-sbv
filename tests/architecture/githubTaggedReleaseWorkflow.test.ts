import { mkdtempSync, mkdirSync, openSync, closeSync, writeSync, ftruncateSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const taggedReleaseWorkflow = readFileSync(".github/workflows/build-release.yml", "utf8");
const signPathWorkflow = readFileSync(".github/workflows/signpath-windows-exe.yml", "utf8");
const buildPlatformScript = readFileSync("scripts/build-platform.cjs", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as { version: string; scripts: Record<string, string> };

function includesAll(value: string, required: string[]): boolean {
  return required.every((entry) => value.includes(entry));
}

function includesNone(value: string, forbidden: string[]): boolean {
  return forbidden.every((entry) => !value.includes(entry));
}

function inspectTaggedReleaseWorkflow(workflow: string) {
  const releaseGateSteps = packageJson.scripts["release:check"].split("&&").map((step) => step.trim());
  const requiredReleaseSteps = [
    "npm run build:verify",
    "npm run release:check:backup-restore",
    "node scripts/check-release-candidate-readiness.cjs",
    "npm run build:compile",
  ];
  const releaseStepsOrdered = requiredReleaseSteps.every((step, index) => {
    const position = releaseGateSteps.indexOf(step);
    const previous = index === 0 ? -1 : releaseGateSteps.indexOf(requiredReleaseSteps[index - 1]);
    return position > previous;
  });

  return {
    tagTriggerAndConcurrency: includesAll(workflow, [
      "tags:",
      '- "v*"',
      "workflow_dispatch:",
      "release_tag:",
      "group: tagged-release-${{ github.event_name == 'workflow_dispatch' && inputs.release_tag || github.ref_name }}",
      "cancel-in-progress: false",
    ]),
    tagVersionGuard: includesAll(workflow, [
      "verify-tag:",
      'tag_version="${RELEASE_TAG#v}"',
      "does not match package.json version",
      "needs: verify-tag",
    ]),
    qualityAndArtifactSeparation: includesAll(workflow, [
      "quality-gates:",
      "npm run build:verify",
      "build-artifacts:",
      "- quality-gates",
      "npm run build:compile",
    ]),
    supportedPlatforms: includesAll(workflow, [
      "node scripts/build-platform.cjs linux",
      "node scripts/build-platform.cjs win-portable",
      "Linux AppImage",
      "Windows portable EXE",
    ]),
    windowsPortableOnly: includesAll(buildPlatformScript, ["'--win', 'portable'", "'--x64'"])
      && includesNone(buildPlatformScript, ["'--win', 'nsis'", "win-installer"])
      && includesNone(workflow, ["Package Windows installer", "win-x64-setup.exe"]),
    publishIsSingleOwner: includesAll(buildPlatformScript, ["'--publish', 'never'"])
      && includesAll(workflow, ["gh release upload", "--clobber"])
      && includesNone(workflow, ["softprops/action-gh-release@v2"]),
    existingReleaseIsUpdatable: includesAll(workflow, [
      "already exists; verified assets will be replaced in place",
      "gh release upload \"${RELEASE_TAG}\"",
      "--clobber",
      "gh release delete-asset",
      "legacy_asset=",
    ]),
    platformVerificationFollowsPackaging:
      workflow.indexOf("Verify Windows artifact, portable startup, paths and backup/restore")
        > workflow.indexOf("Package Windows portable EXE")
      && workflow.indexOf("Verify Linux artifact, desktop startup, paths and backup/restore")
        > workflow.indexOf("Package Linux AppImage"),
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
    appBuildDoesNotRepeatTests: packageJson.scripts.build === "npm run build:verify && npm run build:compile"
      && packageJson.scripts["build:app"] === "npm run build:compile"
      && packageJson.scripts["build:compile"].includes("vite build")
      && !packageJson.scripts["build:compile"].includes("vitest run")
      && !packageJson.scripts["build:compile"].includes("npm run test:coverage"),
    targetedRegressionScript: packageJson.scripts["test:github-actions"] === "vitest run tests/architecture/githubTaggedReleaseWorkflow.test.ts tests/architecture/signpathCodeSigning.test.ts",
  };
}

function createSparsePe(pathname: string): void {
  const fd = openSync(pathname, "w");
  try {
    writeSync(fd, Buffer.from([0x4d, 0x5a]), 0, 2, 0);
    ftruncateSync(fd, 26 * 1024 * 1024);
  } finally {
    closeSync(fd);
  }
}

describe("Taggebundener GitHub-Release-Build", () => {
  it("erfüllt den vollständigen semantischen Releasevertrag", () => {
    expect(inspectTaggedReleaseWorkflow(taggedReleaseWorkflow)).toEqual({
      tagTriggerAndConcurrency: true,
      tagVersionGuard: true,
      qualityAndArtifactSeparation: true,
      supportedPlatforms: true,
      windowsPortableOnly: true,
      publishIsSingleOwner: true,
      existingReleaseIsUpdatable: true,
      platformVerificationFollowsPackaging: true,
      noWorkflowArtifactRoundtrip: true,
      noE2eInPackagingWorkflow: true,
      node24Compatibility: true,
      unsupportedActionMajorsAbsent: true,
      releaseStepsOrdered: true,
      appBuildDoesNotRepeatTests: true,
      targetedRegressionScript: true,
    });
  });

  it("ignoriert interne win-unpacked EXEs bei der Endanwender-Artefaktprüfung", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "gremia-release-artifact-"));
    try {
      const releaseDir = path.join(temp, "release");
      const unpackedDir = path.join(releaseDir, "win-unpacked");
      mkdirSync(unpackedDir, { recursive: true });

      const since = Date.now() - 1000;
      createSparsePe(path.join(releaseDir, `Gremia.SBV-${packageJson.version}-win-x64-portable.exe`));
      createSparsePe(path.join(unpackedDir, "Gremia.SBV.exe"));

      const verifier = path.resolve("scripts/verify-release-artifacts.cjs");
      const result = spawnSync(process.execPath, [verifier, "win", "--since", String(since)], {
        cwd: temp,
        encoding: "utf8",
      });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Release-Artefakt OK");
      expect(result.stderr).toBe("");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
  it("kann die Plattformprüfung nach dem Packaging über einen verifizierten Buildbeleg erneut ausführen", () => {
    const temp = mkdtempSync(path.join(os.tmpdir(), "gremia-release-receipt-"));
    try {
      const releaseDir = path.join(temp, "release");
      mkdirSync(releaseDir, { recursive: true });
      const since = Date.now() - 1000;
      const artifact = path.join(releaseDir, `Gremia.SBV-${packageJson.version}-win-x64-portable.exe`);
      createSparsePe(artifact);

      const verifier = path.resolve("scripts/verify-release-artifacts.cjs");
      const first = spawnSync(process.execPath, [verifier, "win", "--since", String(since), "--write-receipt"], {
        cwd: temp,
        encoding: "utf8",
      });
      expect(first.status).toBe(0);

      const repeated = spawnSync(process.execPath, [verifier, "win"], { cwd: temp, encoding: "utf8" });
      expect(repeated.status).toBe(0);
      expect(repeated.stdout).toContain("Release-Artefakt OK");
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

});
