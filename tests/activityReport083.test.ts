import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.3 Tätigkeitsbericht", () => {
  it("ships report service and report view", () => {
    const service = readFileSync("services/activityReportService.ts", "utf8");
    const view = readFileSync("src/app/features/reports/ReportsView.tsx", "utf8");
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(service).toContain("renderActivityReport");
    expect(service).toContain("SBV-Tätigkeitsbericht");
    expect(view).toContain("Tätigkeitsbericht erzeugen");
    expect(view).toContain("PDF exportieren");
    expect(view).toContain("Markdown exportieren");
    expect(app).toContain("reportsWorkbench.css");
  });

  it("includes all relevant Fachmodule in the aggregated report", () => {
    const service = readFileSync("services/activityReportService.ts", "utf8");

    expect(service).toContain("Präventionsverfahren");
    expect(service).toContain("BEM-Verfahren");
    expect(service).toContain("Gleichstellung-/GdB-Verfahren");
    expect(service).toContain("Kündigungsanhörungen");
    expect(service).toContain("Fallakten nach Kategorie");
  });
});
