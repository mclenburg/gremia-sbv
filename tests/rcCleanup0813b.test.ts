import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function read(path: string) {
  return readFileSync(path, "utf8");
}

describe("RC cleanup readiness", () => {
  it("keeps postinstall and build lifecycle contracts intact", () => {
    const pkg = JSON.parse(read("package.json"));
    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
    expect(pkg.scripts.prebuild).toBe(
      "npm run version:generate && npm run source:cleanup && npm run build:readiness",
    );
    expect(pkg.scripts.build).toContain("npm run test");
    expect(pkg.scripts["cleanup:legacy"]).toBeUndefined();
    expect(existsSync("scripts/cleanup-legacy-artifacts.cjs")).toBe(false);
  });

  it("keeps active documentation limited to durable RC documents", () => {
    const docs = readdirSync("docs").filter((entry) => entry.endsWith(".md"));
    const transientDocs = docs.filter(
      (entry) =>
        entry.startsWith("PATCH_") ||
        entry.startsWith("DOCUMENTATION_AUDIT_") ||
        entry.endsWith("_FIX.md") ||
        entry.includes("_FIX_"),
    );
    expect(transientDocs).toEqual([]);

    const docsReadme = read("docs/README.md");
    const referencedDocs = [...docsReadme.matchAll(/`([^`]+\.md)`/g)].map((match) => match[1]);
    for (const doc of referencedDocs) {
      expect(existsSync(join("docs", doc)), `${doc} is referenced by docs/README.md`).toBe(true);
    }
  });

  it("keeps the consolidated cleanup manifest for obsolete project files", () => {
    const manifest = JSON.parse(read("maintenance/source-cleanup/obsolete-files-0.8.13-b.json"));
    expect(manifest.files).toContain("scripts/cleanup-legacy-artifacts.cjs");
    expect(manifest.files.some((file: string) => file.startsWith("docs/PATCH_"))).toBe(true);
    expect(manifest.directories).toContain("tests/e2e");
  });
});
