import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.58 SBV DSGVO documentation", () => {
  it("adds SBV-specific DSGVO documentation", () => {
    expect(existsSync("docs/DSGVO_SBV.md")).toBe(true);
    const doc = readFileSync("docs/DSGVO_SBV.md", "utf8");

    expect(doc).toContain("Gremia.SBV");
    expect(doc).toContain("Schwerbehindertenvertretung");
    expect(doc).toContain("Art. 9 DSGVO");
    expect(doc).toContain("Gesundheitsdaten");
    expect(doc).toContain("§ 178 Abs. 2 Satz 1 SGB IX");
    expect(doc).toContain("ExportGuard");
    expect(doc).toContain("Übergabe");
    expect(doc).toContain("keine automatische Vollsynchronisation");
  });

  it("does not copy the BR role model as SBV default", () => {
    const doc = readFileSync("docs/DSGVO_SBV.md", "utf8");

    expect(doc).toContain("Nicht übernommen aus Gremia.BR");
    expect(doc).toContain("BR-Vorsitz");
    expect(doc).toContain("BR-Ausschusslogik");
    expect(doc).toContain("technische Administration darf grundsätzlich keine Fallakteninhalte lesen");
  });

  it("adds DSFA, deletion and processing inventory documents", () => {
    expect(existsSync("docs/DSFA_SBV_TEMPLATE.md")).toBe(true);
    expect(existsSync("docs/LOESCHKONZEPT_SBV.md")).toBe(true);
    expect(existsSync("docs/VERARBEITUNGSVERZEICHNIS_SBV.md")).toBe(true);
  });
});
