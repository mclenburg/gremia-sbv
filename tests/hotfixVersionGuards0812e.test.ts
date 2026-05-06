import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hotfix-safe test guards", () => {
  it("checks technical contracts instead of concrete package versions", () => {
    const guardSource = readFileSync("tests/noPackageVersionPinning0812f.test.ts", "utf8");

    expect(guardSource).toContain("does not use the package version as a stable product contract");
    expect(guardSource).toContain("isVersionAssertion");
    expect(guardSource).not.toContain("0.8.12-");
    expect(guardSource).not.toContain("0.8.13");
    expect(guardSource).not.toContain("0.9.0");
  });

  it("keeps the native Electron dependency rebuild contract stable", () => {
    const project = JSON.parse(readFileSync("package.json", "utf8"));

    expect(project.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
