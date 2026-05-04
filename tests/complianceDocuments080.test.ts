import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.0 Compliance documents", () => {
  it("contains all requested one-click compliance document types", () => {
    const service = readFileSync("services/complianceCenterService.ts", "utf8");

    expect(service).toContain("type: 'toms'");
    expect(service).toContain("type: 'dsfa'");
    expect(service).toContain("type: 'dsgvo_bdsg_matrix'");
    expect(service).toContain("type: 'dsb_it_security_approval'");
  });

  it("documents TOMs, DSFA, DSGVO/BDSG and DSB/IT-Security approval content", () => {
    const service = readFileSync("services/complianceCenterService.ts", "utf8");

    expect(service).toContain("Technische und organisatorische Maßnahmen");
    expect(service).toContain("Datenschutz-Folgenabschätzung");
    expect(service).toContain("Art. 35 DSGVO");
    expect(service).toContain("DSGVO-/BDSG-Compliance-Auswertung");
    expect(service).toContain("Freigabeformular Gremia.SBV für Datenschutzbeauftragte und IT-Security");
    expect(service).toContain("keine abschließende Bewertung");
  });
});
