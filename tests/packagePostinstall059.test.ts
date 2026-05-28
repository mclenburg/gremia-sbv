import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("package native dependency rebuild", () => {
  it("keeps npm install clean and exposes the Electron bootstrap as explicit command", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.scripts.postinstall).toBeUndefined();
    expect(pkg.scripts["native:install-app-deps"]).toBe("node scripts/install-electron-app-deps.cjs");
    expect(pkg.scripts["native:rebuild:electron"]).toBe("node scripts/install-electron-app-deps.cjs");
  });
});
