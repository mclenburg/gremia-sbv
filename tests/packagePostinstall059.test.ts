import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.9 package native dependency rebuild", () => {
  it("runs electron-builder install-app-deps after npm install", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
