import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveRuntimeDataDirectory } from "../electron/runtimeDataDirectory";

const base = {
  packaged: true,
  userDataDirectory: path.resolve(["C", ":", "/Users/Test/AppData/Roaming/Gremia.SBV"].join("")),
  workingDirectory: path.resolve(["C", ":", "/Arbeitsordner mit Leerzeichen/Ümlaut"].join("")),
};

describe("plattformübergreifende Datenpfadauflösung", () => {
  it("verwendet bei einer portablen Windows-App das Verzeichnis der gestarteten EXE", () => {
    const portableRoot = path.resolve(["C", ":", "/Portable Apps/Gremia.SBV ÄÖÜ"].join(""));
    expect(resolveRuntimeDataDirectory({ ...base, portableExecutableDirectory: portableRoot }))
      .toBe(path.join(portableRoot, "Gremia.SBV-Daten"));
  });

  it("priorisiert einen ausdrücklich konfigurierten Datenpfad vor Portable und AppData", () => {
    const configured = path.resolve(["C", ":", "/SBV Daten/Produktiv"].join(""));
    expect(resolveRuntimeDataDirectory({
      ...base,
      configuredDataDirectory: configured,
      portableExecutableDirectory: path.resolve(["C", ":", "/Portable"].join("")),
    })).toBe(configured);
  });

  it("fällt bei installierten Builds ohne Portable-Kontext auf AppData zurück", () => {
    expect(resolveRuntimeDataDirectory(base)).toBe(path.join(base.userDataDirectory, "data"));
  });

  it("normalisiert relative Entwicklungs- und Testpfade gegen das Arbeitsverzeichnis", () => {
    expect(resolveRuntimeDataDirectory({ ...base, configuredDataDirectory: "relative Daten" }))
      .toBe(path.resolve(base.workingDirectory, "relative Daten"));
  });

  it("hält den Demo-Pfad strikt vorrangig", () => {
    const demo = path.resolve(["C", ":", "/Temp/Gremia Demo"].join(""));
    expect(resolveRuntimeDataDirectory({
      ...base,
      demoDataDirectory: demo,
      configuredDataDirectory: path.resolve(["C", ":", "/Produktiv"].join("")),
      portableExecutableDirectory: path.resolve(["C", ":", "/Portable"].join("")),
    })).toBe(demo);
  });
});
