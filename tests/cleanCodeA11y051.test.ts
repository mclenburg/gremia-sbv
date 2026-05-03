import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.1 live region usage", () => {
  it("announces case workbench status and error messages", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("const announce = useAnnouncer();");
    expect(workflow).toContain("if (noteInfo) announce(noteInfo, 'polite')");
    expect(workflow).toContain("noteError || documentError || error || caseLoadError");
    expect(workflow).toContain("caseToast?.message");
  });

  it("announces template status messages consistently", () => {
    const templates = readFileSync("src/app/features/templates/TemplatesView.tsx", "utf8");

    expect(templates).toContain("const announce = useAnnouncer();");
    expect(templates).toContain("if (error) announce(error, 'assertive')");
    expect(templates).toContain("if (info) announce(info, 'polite')");
  });

  it("announces report generation and errors", () => {
    const reports = readFileSync("src/app/features/reports/ReportsView.tsx", "utf8");

    expect(reports).toContain("useAnnouncer");
    expect(reports).toContain("if (error) announce(error, 'assertive')");
    expect(reports).toContain("Bericht ${result.title} wurde erzeugt.");
  });
});
