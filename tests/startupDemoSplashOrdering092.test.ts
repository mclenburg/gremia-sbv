import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readElectronMain(): string {
  return readFileSync(join(process.cwd(), "electron", "main.ts"), "utf8");
}

function readElectronRuntime(): string {
  return readFileSync(join(process.cwd(), "electron", "appRuntime.ts"), "utf8");
}

describe("Demo-Start Splash-Reihenfolge 0.9.2", () => {
  it("zeigt den Splash vor Demo-Reset und Demo-Tresoraufbau", () => {
    const bootstrap = readElectronMain();
    const runtime = readElectronRuntime();
    const splashIndex = bootstrap.indexOf('const splash = await showStartupSplash("app")');
    const runtimeImportIndex = bootstrap.indexOf('await import("./appRuntime.js")');
    const resetIndex = runtime.indexOf("resetDemoDataDirectory(dataDirectory)");
    const prepareIndex = runtime.indexOf("await prepareDemoVault(security)");
    const windowIndex = runtime.indexOf("await createWindow()");

    expect(splashIndex).toBeGreaterThan(-1);
    expect(runtimeImportIndex).toBeGreaterThan(-1);
    expect(resetIndex).toBeGreaterThan(-1);
    expect(prepareIndex).toBeGreaterThan(-1);
    expect(windowIndex).toBeGreaterThan(-1);
    expect(splashIndex).toBeLessThan(runtimeImportIndex);
    expect(resetIndex).toBeLessThan(prepareIndex);
    expect(prepareIndex).toBeLessThan(windowIndex);
  });

  it("behandelt erneute Startversuche während des Splash-Zustands als laufende Instanz", () => {
    const main = readElectronMain();

    expect(main).toContain('app.on("second-instance"');
    expect(main).toContain('void updateStartupSplash("already-running")');
    expect(main).toContain("focusStartupWindow()");
  });
});
