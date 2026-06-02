import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.58 SBV privacy policy contracts", () => {
  it("documents DSFA risks for SBV case work", () => {
    const dsfa = readFileSync("docs/DSFA_SBV_TEMPLATE.md", "utf8");

    expect(dsfa).toContain("Datenschutz-Folgenabschätzung");
    expect(dsfa).toContain("besondere Kategorien");
    expect(dsfa).toContain("SQLCipher");
    expect(dsfa).toContain("ExportGuard");
    expect(dsfa).toContain("Verlust portabler Datenbank");
    expect(dsfa).toContain("Übergabedatei");
  });

  it("documents SBV-specific deletion and anonymization", () => {
    const deletion = readFileSync("docs/LOESCHKONZEPT_SBV.md", "utf8");

    expect(deletion).toContain("Soft Delete");
    expect(deletion).toContain("Anonymisierung");
    expect(deletion).toContain("Hard Delete");
    expect(deletion).toContain("Kündigungsanhörung");
    expect(deletion).toContain("BEM");
    expect(deletion).toContain("Keine BR-Fristen übernehmen");
    expect(deletion).toContain("Fall-Dokumentdateien werden bei der bestätigten Fall-Anonymisierung physisch");
    expect(deletion).toContain("keine verwaisten Dokumentdateien zurücklassen");
  });

  it("documents SBV processing activities instead of BR proceedings", () => {
    const inventory = readFileSync("docs/VERARBEITUNGSVERZEICHNIS_SBV.md", "utf8");

    expect(inventory).toContain("SBV-Fallberatung");
    expect(inventory).toContain("Präventionsverfahren nach § 167 Abs. 1 SGB IX");
    expect(inventory).toContain("Betriebliches Eingliederungsmanagement");
    expect(inventory).toContain("Kündigungsanhörung");
    expect(inventory).toContain("Gleichstellung / GdB-Beratung");
    expect(inventory).toContain("Übergabe / Vertretung");
  });

  it("keeps ExportGuard and transition export as mandatory privacy themes", () => {
    const dsgvo = readFileSync("docs/DSGVO_SBV.md", "utf8");
    const inventory = readFileSync("docs/VERARBEITUNGSVERZEICHNIS_SBV.md", "utf8");

    expect(dsgvo).toContain("Für DOCX-, PDF-, Dokumenten- und Übergabeexporte soll grundsätzlich eine bewusste Bestätigung erforderlich sein");
    expect(inventory).toContain("selektiver Export");
    expect(inventory).toContain("Ablaufdatum");
    expect(inventory).toContain("keine automatische Vollsynchronisation");
  });
});
