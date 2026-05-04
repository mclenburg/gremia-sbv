import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.3 Datenschutz im Tätigkeitsbericht", () => {
  it("documents that reports are anonymized and free of sensitive texts", () => {
    const service = readFileSync("services/activityReportService.ts", "utf8");

    expect(service).toContain("anonymisiert");
    expect(service).toContain("keine Namen");
    expect(service).toContain("keine Aktenzeichen");
    expect(service).toContain("keine Diagnosen");
    expect(service).toContain("keine Arbeitgebervorträge");
    expect(service).toContain("keine SBV-Stellungnahmen");
  });

  it("contains a guard helper against sensitive free text", () => {
    const service = readFileSync("services/activityReportService.ts", "utf8");

    expect(service).toContain("assertActivityReportHasNoSensitiveFreeText");
    expect(service).toContain("Arbeitgebervortrag:");
    expect(service).toContain("SBV-Stellungnahme:");
    expect(service).toContain("Gesprächsnotiz:");
  });
});
