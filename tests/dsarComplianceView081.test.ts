import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.1 DSAR ComplianceView integration", () => {
  it("adds a form for generating a DSAR response", () => {
    const view = readFileSync("src/app/features/compliance/ComplianceView.tsx", "utf8");

    expect(view).toContain("DataSubjectAccessRequestInput");
    expect(view).toContain("defaultDsarInput");
    expect(view).toContain("renderDsarResponseDocument");
    expect(view).toContain("Auskunftsersuchen beantworten");
    expect(view).toContain("Identität geprüft");
    expect(view).toContain("Auskunftsantwort erzeugen");
  });

  it("adds responsive styles for the DSAR form", () => {
    const css = readFileSync("src/app/complianceCenter.css", "utf8");

    expect(css).toContain(".compliance-dsar-form");
    expect(css).toContain(".compliance-form-grid");
    expect(css).toContain(".compliance-checkbox");
  });
});
