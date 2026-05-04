import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.2 Compliance layout", () => {
  it("uses a full-width responsive layout instead of a narrow two-column preview", () => {
    const css = readFileSync("src/app/complianceCenter.css", "utf8");

    expect(css).toContain("grid-template-columns: 1fr");
    expect(css).toContain("repeat(auto-fit");
    expect(css).toContain(".compliance-export-actions");
    expect(css).toContain("white-space: pre-wrap");
  });

  it("keeps the DSAR form as a dedicated wide section", () => {
    const view = readFileSync("src/app/features/compliance/ComplianceView.tsx", "utf8");

    expect(view).toContain("compliance-dsar-form");
    expect(view).toContain("Auskunftsersuchen beantworten");
  });
});
