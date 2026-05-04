import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.3a ReportService compliance document PDF path", () => {
  it("adds compliance_document to report types and service build switch", () => {
    const model = readFileSync("src/app/core/models/report.model.ts", "utf8");
    const service = readFileSync("services/reportService.ts", "utf8");

    expect(model).toContain("| 'compliance_document'");
    expect(model).toContain("complianceBody?: string");
    expect(service).toContain("type: 'compliance_document'");
    expect(service).toContain("case 'compliance_document': return this.buildComplianceDocumentReport(input);");
    expect(service).toContain("private buildComplianceDocumentReport");
    expect(service).toContain("markdownToReportHtml");
  });
});
