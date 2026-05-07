import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

describe("release candidate freeze documentation", () => {
  it("keeps generated metadata, release notes and public docs aligned with the package version", () => {
    const project = readJson<{ version: string }>("package.json");
    const version = project.version;
    const releaseNotesPath = `docs/RELEASE_NOTES_${version}.md`;

    expect(existsSync(releaseNotesPath)).toBe(true);
    expect(readFileSync("src/app/generated/appVersion.ts", "utf8")).toContain(`APP_VERSION = "${version}"`);
    expect(readFileSync("services/generated/appMetadata.ts", "utf8")).toContain(`APP_VERSION = "${version}"`);

    for (const file of [
      "README.md",
      "docs/BUILD.md",
      "docs/E2E_TESTS.md",
      "docs/KNOWN_ISSUES.md",
      "docs/LICENSE_POLICY.md",
      "docs/RELEASE_CHECKLIST.md",
      "docs/ROADMAP.md",
      releaseNotesPath,
    ]) {
      expect(readFileSync(file, "utf8"), `${file} muss den RC-Stand ausweisen`).toContain(version);
    }
  });

  it("documents the post-RC freeze without adding new product scope", () => {
    const roadmap = readFileSync("docs/ROADMAP.md", "utf8");
    const releaseNotes = readFileSync(`docs/RELEASE_NOTES_${readJson<{ version: string }>("package.json").version}.md`, "utf8");
    const checklist = readFileSync("docs/RELEASE_CHECKLIST.md", "utf8");

    for (const source of [roadmap, releaseNotes, checklist]) {
      expect(source).toContain("Security-Fixes");
      expect(source).toContain("Datenverlust");
      expect(source).toContain("Dokumentationskorrekturen");
    }

    expect(releaseNotes).toContain("keine neuen Fachfeatures");
    expect(releaseNotes).toContain("keine Cloud-Synchronisation");
    expect(releaseNotes).toContain("AGPL-3.0-or-later");
  });
});
