import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("0.8.12-e hotfix version guards", () => {
  it("does not pin earlier 0.8.12 hotfix tests to one exact patch suffix", () => {
    const typeImportGuard = readFileSync("tests/caseNoteLinkTypeImports0812c.test.ts", "utf8");
    const bemMigrationGuard = readFileSync("tests/bemMigrationFreshInstall0812d.test.ts", "utf8");

    expect(typeImportGuard).toContain("0\\.8\\.12");
    expect(bemMigrationGuard).toContain("0\\.8\\.12");
    expect(typeImportGuard).not.toContain("toBe('0.8.12-c')");
    expect(bemMigrationGuard).not.toContain('toBe("0.8.12-d")');
  });

  it("keeps the native Electron dependency rebuild contract stable", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.version).toBe("0.8.12-e");
    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
