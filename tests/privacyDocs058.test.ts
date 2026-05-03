import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

describe("0.5.8 privacy and export documentation", () => {
  it("documents BEM export and backup handling", () => {
    expect(existsSync("docs/PRIVACY_EXPORT_BACKUP_0_5_8.md")).toBe(true);
    const doc = readFileSync("docs/PRIVACY_EXPORT_BACKUP_0_5_8.md", "utf8");

    expect(doc).toContain("BEM");
    expect(doc).toContain("ExportGuard");
    expect(doc).toContain("Backup");
    expect(doc).toContain("Art. 9 DSGVO");
    expect(doc).toContain("§ 167 Abs. 2 SGB IX");
  });

  it("shows a BEM-specific warning in the process template modal", () => {
    const source = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(source).toContain("BEM-Dokumente enthalten regelmäßig");
    expect(source).toContain("bewusste Exportbestätigung");
  });

  it("uses current BEM schema fields in the BEM/prevention report", () => {
    const source = readFileSync("services/reportService.ts", "utf8");

    expect(source).toContain("privacy_notice_at");
    expect(source).toContain("consent_scope");
    expect(source).toContain("confidential_notes");
    expect(source).not.toContain("current_phase");
    expect(source).not.toContain("bem_measures");
  });
});
