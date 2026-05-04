import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.1 DSGVO-Auskunftsersuchen", () => {
  it("adds a DSAR response document type and renderer", () => {
    const model = readFileSync("src/app/core/models/compliance.model.ts", "utf8");
    const service = readFileSync("services/complianceCenterService.ts", "utf8");

    expect(model).toContain("'dsar_response'");
    expect(model).toContain("DataSubjectAccessRequestInput");
    expect(service).toContain("defaultDsarInput");
    expect(service).toContain("renderDsarResponseDocument");
    expect(service).toContain("Antwort auf Auskunftsersuchen nach Art. 15 DSGVO");
  });

  it("covers the required Art. 15 DSGVO response sections", () => {
    const service = readFileSync("services/complianceCenterService.ts", "utf8");

    expect(service).toContain("Verarbeitungszwecke");
    expect(service).toContain("Kategorien personenbezogener Daten");
    expect(service).toContain("Besondere Kategorien personenbezogener Daten");
    expect(service).toContain("Empfänger oder Kategorien von Empfängern");
    expect(service).toContain("Speicherdauer / Löschung");
    expect(service).toContain("Herkunft der Daten");
    expect(service).toContain("Automatisierte Entscheidungsfindung");
    expect(service).toContain("Interne Prüfliste vor Versand");
  });
});
