import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts: Record<string, string>;
  desktopName?: string;
  build: { linux: { syncDesktopName?: boolean } };
};
const crossPlatformWorkflow = readFileSync(".github/workflows/cross-platform-release-verification.yml", "utf8");
const releaseWorkflow = readFileSync(".github/workflows/build-release.yml", "utf8");
const buildPlatform = readFileSync("scripts/build-platform.cjs", "utf8");
const artifactVerifier = readFileSync("scripts/verify-release-artifacts.cjs", "utf8");
const startupSmoke = readFileSync("scripts/run-packaged-startup-smoke.cjs", "utf8");

describe("Patch-4-Cross-Platform- und Packaging-Vertrag", () => {
  it("führt die reale Abnahme nativ auf Ubuntu und Windows aus", () => {
    expect(crossPlatformWorkflow).toContain("ubuntu-latest");
    expect(crossPlatformWorkflow).toContain("windows-latest");
    expect(crossPlatformWorkflow).toContain("run: npm ci");
    expect(crossPlatformWorkflow).toContain("run: npm run native:diagnose");
    expect(crossPlatformWorkflow).toContain("run: npm run build:quality");
    expect(crossPlatformWorkflow).toContain("run: npm run build:compile");
    expect(crossPlatformWorkflow).toContain("release:platform:windows");
    expect(crossPlatformWorkflow).toContain("release:platform:linux");
  });

  it("verifiziert auch im taggebundenen Releaseweg Startfähigkeit und Plattformpfade", () => {
    expect(releaseWorkflow).toContain("Verify Windows artifacts, portable startup, paths and backup/restore");
    expect(releaseWorkflow).toContain("Verify Linux artifact, desktop startup, paths and backup/restore");
    expect(releaseWorkflow).toContain("xvfb-run -a npm run release:platform:linux");
    expect(releaseWorkflow).toContain("run: npm run release:platform:windows");
  });

  it("erzwingt Artefaktprüfung für das aktuelle Packaging und ignoriert Altartefakte", () => {
    expect(buildPlatform).toContain("scripts/verify-release-artifacts.cjs");
    expect(buildPlatform).toContain("const packagingStartedAt = Date.now()");
    expect(buildPlatform).toContain("[selected.os, '--since', String(packagingStartedAt), '--write-receipt']");
    expect(buildPlatform).toMatch(
      /runNpmScript\('native:rebuild:electron'\);\s*const packagingStartedAt = Date\.now\(\);\s*runNodeScript\('scripts\/run-electron-builder\.cjs', \[\.\.\.selected\.builderArgs, '--publish', 'never'\]\);\s*runNodeScript\('scripts\/verify-release-artifacts\.cjs', \[selected\.os, '--since', String\(packagingStartedAt\), '--write-receipt'\]\);/,
    );
    expect(buildPlatform).not.toContain("cleanPreviousEndUserArtifacts");
    expect(artifactVerifier).toContain("const sinceIndex = process.argv.indexOf('--since')");
    expect(artifactVerifier).toContain("readReceipt(target)");
    expect(artifactVerifier).toContain("fs.statSync(file).mtimeMs >= since");
    expect(artifactVerifier).toContain("minimumBytes");
    expect(artifactVerifier).toContain("Dateisignatur");
    expect(artifactVerifier).toContain("-win-x64-portable\\.exe");
    expect(artifactVerifier).toContain("-win-x64-setup\\.exe");
  });

  it("prüft den gestarteten Build mit Leerzeichen-, Umlaut- und Langpfad", () => {
    expect(startupSmoke).toContain("Pfad mit Leerzeichen und Ümlauten");
    expect(startupSmoke).toContain("'langer-pfad-'.repeat(9)");
    expect(startupSmoke).toContain("--startup-smoke-test");
    expect(startupSmoke).toContain(".gremia-sbv-${canonicalTarget}-artifact.json");
    expect(startupSmoke).toContain("receipt.artifacts");
    expect(startupSmoke).not.toContain("fs.readdirSync(releaseDir).filter((name) => name.endsWith(extension))");
    expect(startupSmoke).toContain("process.env.CI");
    expect(startupSmoke).toContain("Der PR-/Release-Build darf den Desktop-Smoke nicht still überspringen.");
    expect(pkg.scripts["release:smoke:windows"]).toContain("run-packaged-startup-smoke.cjs win");
    expect(startupSmoke).toContain("-win-x64-portable\\.exe");
  });

  it("konfiguriert die Linux-Desktopintegration eindeutig", () => {
    expect(pkg.desktopName).toBe("de.gremia.sbv.desktop");
    expect(pkg.build.linux.syncDesktopName).toBe(true);
  });
});
