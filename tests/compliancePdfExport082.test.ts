import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.2 Compliance PDF export", () => {
  it("adds a print-optimized PDF export path", () => {
    const view = readFileSync("src/app/features/compliance/ComplianceView.tsx", "utf8");

    expect(view).toContain("openPdfPrintView");
    expect(view).toContain("markdownToPrintableHtml");
    expect(view).toContain("@page { size: A4");
    expect(view).toContain("window.print()");
    expect(view).toContain("PDF exportieren");
  });
});
