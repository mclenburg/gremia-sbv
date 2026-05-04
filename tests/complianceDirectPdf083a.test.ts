import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.3a Compliance direct PDF export", () => {
  it("uses the reports bridge instead of window.print for PDF export", () => {
    const view = readFileSync("src/app/features/compliance/ComplianceView.tsx", "utf8");

    expect(view).toContain("bridge.reports.generate");
    expect(view).toContain("type: 'compliance_document'");
    expect(view).toContain("complianceBody: document.body");
    expect(view).not.toContain("window.open");
    expect(view).not.toContain("window.print");
    expect(view).not.toContain("PDF-Druckansicht");
  });
});
