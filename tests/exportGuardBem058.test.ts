import { describe, expect, it } from "vitest";
import { buildExportWarningMessage, scanBemProcessExport, scanSensitiveExportText } from "../services/exportGuardPolicy";

describe("0.5.8 BEM export guard", () => {
  it("classifies BEM exports as critical even with neutral body text", () => {
    const scan = scanBemProcessExport({
      title: "BEM-Maßnahmenplan",
      body: "Maßnahmen werden geprüft.",
      status: "massnahmen_vereinbart",
      containsConfidentialNotes: false,
      unresolvedPlaceholders: []
    });

    expect(scan.riskLevel).toBe("critical");
    expect(scan.requiresExplicitConfirmation).toBe(true);
    expect(scan.findings.join("\n")).toContain("BEM");
  });

  it("detects confidential BEM notes and unresolved placeholders", () => {
    const scan = scanBemProcessExport({
      title: "BEM-Abschlussvermerk",
      body: "vertrauliche SBV-Notiz: intern",
      containsConfidentialNotes: true,
      unresolvedPlaceholders: ["{{bem.abschlussgrund}}"]
    });

    expect(scan.findings).toContain("vertrauliche BEM-Notiz");
    expect(scan.findings).toContain("nicht aufgelöste BEM-Platzhalter");
    expect(buildExportWarningMessage(scan)).toContain("Export bestätigen");
  });

  it("detects diagnosis and therapy related terms in generic export scans", () => {
    const scan = scanSensitiveExportText("Diagnose und Therapie im BEM-Gespräch", { context: "Zwischenablage" });

    expect(scan.riskLevel).toBe("critical");
    expect(scan.findings.join("\n")).toContain("Diagnose");
  });
});
