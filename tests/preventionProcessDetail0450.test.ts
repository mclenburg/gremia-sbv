import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.50 PreventionProcessDetail extraction", () => {
  it("adds a dedicated prevention detail component", () => {
    expect(existsSync("src/app/features/prevention/PreventionProcessDetail.tsx")).toBe(true);
    const component = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");
    expect(component).toContain("export function PreventionProcessDetail");
    expect(component).toContain("Prüfung und Ausgangslage");
    expect(component).toContain("Reaktion des Arbeitgebers");
    expect(component).toContain("Maßnahmenklärung und Umsetzung");
  });

  it("replaces the inline prevention detail form in workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("import { PreventionProcessDetail } from './features/prevention/PreventionProcessDetail';");
    expect(workflow).toContain("<PreventionProcessDetail");
    expect(workflow).not.toContain("const preventionDifficultyOptions");
    expect(workflow).not.toContain("function canShowEmployerReactionSection");
    expect(workflow).not.toContain("header><span>1</span><strong>Prüfung und Ausgangslage</strong>");
  });

  it("keeps document template access wired through props", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const component = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");
    expect(workflow).toContain("onOpenTemplates={openProcessTemplateModal}");
    expect(component).toContain("onOpenTemplates(process)");
    expect(component).toContain("Dokumente");
  });
});
