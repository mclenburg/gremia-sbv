import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

const durableDocs = [
  "README.md",
  "docs/BUILD.md",
  "docs/E2E_TESTS.md",
  "docs/KNOWN_ISSUES.md",
  "docs/LICENSE_POLICY.md",
  "docs/RELEASE_CHECKLIST.md",
  "docs/ROADMAP.md",
];

describe("release candidate freeze documentation", () => {
  it("keeps generated metadata and durable public docs aligned with the package version", () => {
    const project = readJson<{ version: string }>("package.json");
    const version = project.version;

    expect(existsSync(`docs/RELEASE_NOTES_${version}.md`)).toBe(false);
    expect(readFileSync("src/app/generated/appVersion.ts", "utf8")).toContain(`APP_VERSION = "${version}"`);
    expect(readFileSync("services/generated/appMetadata.ts", "utf8")).toContain(`APP_VERSION = "${version}"`);

    for (const file of durableDocs) {
      expect(readFileSync(file, "utf8"), `${file} muss den RC-Stand ausweisen`).toContain(version);
    }
  });

  it("documents the pre-publication freeze without separate release notes", () => {
    const roadmap = readFileSync("docs/ROADMAP.md", "utf8");
    const checklist = readFileSync("docs/RELEASE_CHECKLIST.md", "utf8");
    const docsReadme = readFileSync("docs/README.md", "utf8");

    for (const source of [roadmap, checklist]) {
      expect(source).toContain("Security-Fixes");
      expect(source).toContain("Datenverlust");
      expect(source).toContain("Dokumentationskorrekturen");
    }

    expect(docsReadme).toContain("vor Veröffentlichung");
    expect(docsReadme).toContain("Release Notes");
    expect(docsReadme).toContain("Change Logs");
    expect(readFileSync("docs/LICENSE_POLICY.md", "utf8")).toContain("AGPL-3.0-or-later");
  });
});
