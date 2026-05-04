import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.0 Compliance Center", () => {
  it("adds compliance as an implemented active view", () => {
    const modules = readFileSync("src/app/core/navigation/modules.ts", "utf8");
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(modules).toContain("| 'compliance'");
    expect(modules).toContain("id: 'compliance'");
    expect(modules).toContain("Compliance Center");
    expect(app).toContain("ComplianceView");
    expect(app).toContain("'compliance'");
    expect(app).toContain("currentView === 'compliance'");
  });

  it("ships compliance feature, service and model", () => {
    const view = readFileSync("src/app/features/compliance/ComplianceView.tsx", "utf8");
    const service = readFileSync("services/complianceCenterService.ts", "utf8");
    const model = readFileSync("src/app/core/models/compliance.model.ts", "utf8");

    expect(view).toContain("TOMs");
    expect(view).toContain("DSFA");
    expect(view).toContain("Markdown exportieren");
    expect(service).toContain("renderComplianceDocument");
    expect(service).toContain("listComplianceDocuments");
    expect(model).toContain("ComplianceDocumentType");
  });
});
