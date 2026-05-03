import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.45 CasesView component split", () => {
  it("adds dedicated case workbench components", () => {
    expect(existsSync("src/app/features/cases/CaseTreePanel.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CaseDetailPanel.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/caseWorkbenchTypes.ts")).toBe(true);
  });

  it("uses extracted components from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("import { CaseTreePanel } from './features/cases/CaseTreePanel';");
    expect(workflow).toContain("import { CaseDetailPanel } from './features/cases/CaseDetailPanel';");
    expect(workflow).toContain("ProcessTemplateDocumentsModal");
    expect(workflow).not.toContain("<aside className=\"industrial-panel case-tree-panel\">");
  });

  it("keeps the case tree implementation out of workflowViews", () => {
    const tree = readFileSync("src/app/features/cases/CaseTreePanel.tsx", "utf8");
    expect(tree).toContain("export function CaseTreePanel");
    expect(tree).toContain("Notizen & Protokolle");
    expect(tree).toContain("Dokumente");
    expect(tree).toContain("Maßnahmen");
  });

  it("documents the staged extraction", () => {
    const docs = readFileSync("docs/CASES_VIEW_COMPONENT_SPLIT_0_4_45.md", "utf8");
    expect(docs).toContain("nicht in einem riskanten Schritt komplett zerlegt");
    expect(docs).toContain("useCaseWorkbenchData");
  });
});
