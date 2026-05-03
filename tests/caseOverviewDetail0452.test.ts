import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.52 CaseOverviewDetail extraction", () => {
  it("adds a dedicated case overview detail component", () => {
    expect(existsSync("src/app/features/cases/CaseOverviewDetail.tsx")).toBe(true);
    const component = readFileSync("src/app/features/cases/CaseOverviewDetail.tsx", "utf8");
    expect(component).toContain("export function CaseOverviewDetail");
    expect(component).toContain("OverviewMetric");
    expect(component).toContain("contextualTemplateActions");
  });

  it("replaces the inline overview block in workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("import { CaseOverviewDetail } from './features/cases/CaseOverviewDetail';");
    expect(workflow).toContain("<CaseOverviewDetail");
    expect(workflow).not.toContain("<Metric label=\"Notizen\" value={String(notes.length)}");
    expect(workflow).not.toContain("Keine Kurzbeschreibung erfasst.</p>\n              <div className=\"case-detail-metrics\"");
  });

  it("keeps contextual templates wired from CasesView", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("contextualTemplateActions={selectedCase && (() => {");
    expect(workflow).toContain("resolveContextualTemplateAction({ sourceType: 'case', title: 'Fallübersicht' })");
    expect(workflow).toContain("<ContextualTemplateButton");
  });
});
