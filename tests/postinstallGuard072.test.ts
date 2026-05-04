import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.2 postinstall guard", () => {
  it("keeps electron-builder install-app-deps in package.json", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.version).toMatch(/^0\.8\./);
    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
