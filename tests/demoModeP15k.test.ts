import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("P15k Demo-Modus", () => {
  it("aktiviert Demo ausschließlich über expliziten Parameter und temporäres Datenverzeichnis", () => {
    const mode = source("services/demoMode.ts");
    expect(mode).toContain('argv.includes("--demo")');
    expect(mode).toContain('process.env.GREMIA_SBV_DEMO === "1"');
    expect(mode).toContain("os.tmpdir()");
    expect(mode).toContain("gremia-sbv-demo");
    expect(mode).toContain("resetDemoDataDirectory");
    expect(mode).toContain("rmSync(dataDir, { recursive: true, force: true })");
  });

  it("setzt das dokumentierte Demo-Passwort und sperrt den Tresor nach der Befüllung wieder", () => {
    const mode = source("services/demoMode.ts");
    expect(mode).toContain('DEMO_PASSWORD = "gremia.sbv-demo"');
    expect(mode).toContain("setupInitialPassword(DEMO_PASSWORD)");
    expect(mode).toContain("seedDemoDatabase(security.getActiveDatabase())");
    expect(mode).toContain('security.lock("demo-ready")');
  });

  it("verdrahtet den Electron-Startpfad auf Demo-Daten, ohne produktive Datenverzeichnisse zu berühren", () => {
    const main = source("electron/appRuntime.ts");
    expect(main).toContain("isDemoMode()");
    expect(main).toContain("resolveDemoDataDirectory()");
    expect(main).toContain("resetDemoDataDirectory(dataDirectory)");
    expect(main).toContain("await prepareDemoVault(security)");
    expect(main).toContain("Gremia.SBV demo mode active");
  });

  it("befüllt die Demo-Datenbank mit ausreichender synthetischer Breite", () => {
    const seed = source("services/demoSeedService.ts");
    expect(seed).toContain("for (let index = 1; index <= 30; index += 1)");
    expect(seed).toContain("for (let index = 1; index <= 20; index += 1)");
    expect(seed).toContain("CASE_MEASURE_TYPES");
    for (const measure of [
      "prevention",
      "bem",
      "termination_hearing",
      "equalization",
      "participation",
      "workplace_accommodation",
    ]) {
      expect(seed).toContain(measure);
    }
    for (const table of [
      "protected_persons",
      "persons",
      "contacts",
      "cases",
      "case_notes",
      "deadlines",
      "bem_processes",
      "prevention_processes",
      "equalization_processes",
      "termination_hearings",
      "sbv_participations",
      "case_measures",
      "case_measure_workplace_accommodation",
      "sbv_resource_records",
      "compliance_incidents",
      "document_templates",
    ]) {
      expect(seed).toContain(`INSERT INTO ${table}`);
    }
    expect(seed).toContain("Synthetischer Demo-Datensatz ohne reale Person");
  });

  it("macht den Demo-Modus in README und npm-Skripten sichtbar", () => {
    const readme = source("README.md");
    const pkg = source("package.json");
    expect(readme).toContain("## Gremia.SBV gefahrlos ausprobieren: Demo-Modus");
    expect(readme).toContain("./Gremia.SBV-linux-x86_64.AppImage --demo");
    expect(readme).toContain(".\\Gremia.SBV-win-x64.exe --demo");
    expect(readme).toContain('"Gremia.SBV.exe" --demo');
    expect(readme).toContain("npm run dev:demo");
    expect(readme).toContain("gremia.sbv-demo");
    expect(readme).toContain("Alle Demo-Daten sind frei erfunden");
    expect(pkg).toContain('"dev:demo"');
    expect(pkg).toContain('"start:demo"');
  });
});
