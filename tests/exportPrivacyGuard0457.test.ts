import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { scanReportTextForPrivacyRisks } from "../services/reportPrivacyPolicy";

function sourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(entry) ? [full] : [];
  });
}

describe("0.4.57 export privacy and confirmation contracts", () => {
  it("detects typical SBV privacy risks in export text", () => {
    const findings = scanReportTextForPrivacyRisks("Fall SBV-2026-001, max@example.org, Diagnose Burnout, GdB 50");

    expect(findings.some((finding) => finding.type === "aktenzeichen")).toBe(true);
    expect(findings.some((finding) => finding.type === "email")).toBe(true);
    expect(findings.some((finding) => finding.type === "health_hint")).toBe(true);
  });

  it("does not use native window.confirm in application source", () => {
    const offenders = sourceFiles("src")
      .filter((file) => readFileSync(file, "utf8").includes("window.confirm"));

    expect(offenders).toEqual([]);
  });

  it("uses the design-system confirm dialog for destructive template actions", () => {
    const templates = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");

    expect(templates).toContain("useConfirmDialog()");
    expect(templates).toContain("confirmDialog({");
    expect(templates).toContain("deleteTemplate");
  });

  it("keeps the confirm dialog accessible", () => {
    const confirmProvider = readFileSync("src/app/shared/dialogs/ConfirmDialogProvider.tsx", "utf8");

    expect(confirmProvider).toContain("aria-modal=\"true\"");
    expect(confirmProvider).toMatch(/industrial-(confirm|modal)-backdrop/);
    expect(confirmProvider).toContain("resolve");
  });
});
