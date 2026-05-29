import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readElectronMain(): string {
  return readFileSync(join(process.cwd(), "electron", "main.ts"), "utf8");
}

describe("Demo-Start Splash-Reihenfolge 0.9.2", () => {
  it("zeigt den Splash vor Demo-Reset und Demo-Tresoraufbau", () => {
    const main = readElectronMain();
    const splashIndex = main.indexOf('await showStartupSplash("app")');
    const resetIndex = main.indexOf("resetDemoDataDirectory(dataDirectory)");
    const prepareIndex = main.indexOf("await prepareDemoVault(security)");
    const windowIndex = main.indexOf("return createWindow()");

    expect(splashIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(prepareIndex).toBeGreaterThan(-1);
    expect(windowIndex).toBeGreaterThan(-1);
    expect(splashIndex).toBeLessThan(resetIndex);
    expect(splashIndex).toBeLessThan(prepareIndex);
    expect(splashIndex).toBeLessThan(windowIndex);
  });

  it("behandelt erneute Startversuche während des Splash-Zustands als laufende Instanz", () => {
    const main = readElectronMain();

    expect(main).toContain('app.on("second-instance"');
    expect(main).toContain('void updateStartupSplash("already-running")');
    expect(main).toContain("focusStartupWindow()");
  });
});
