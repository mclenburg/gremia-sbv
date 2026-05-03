import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.0 BEM case workbench integration", () => {
  it("loads BEM processes together with the case file", () => {
    const hook = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");

    expect(hook).toContain("caseBemProcesses");
    expect(hook).toContain("bridge.bem?.list(selectedCaseId)");
    expect(hook).toContain("pendingCaseNodeTarget.nodeType === 'bem'");
    expect(hook).toContain("setSelection({ type: 'process', processType: 'bem'");
  });

  it("shows BEM entries in the case tree", () => {
    const tree = readFileSync("src/app/features/cases/CaseTreePanel.tsx", "utf8");

    expect(tree).toContain("bemProcesses");
    expect(tree).toContain("processType: 'bem'");
    expect(tree).toContain("<span>BEM</span>");
  });

  it("renders the BEM detail panel and creates BEM from the case footer", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("selectedBemProcess");
    expect(workflow).toContain("<BemProcessDetail");
    expect(workflow).toContain("bridge.bem.create");
    expect(workflow).toContain("BEM-Verfahren wurde direkt an der Fallakte angelegt");
  });

  it("keeps BEM process templates status-bound", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(workflow).toContain("massnahme:bem");
    expect(workflow).toContain("category: processType === 'bem' ? 'bem' : 'praevention'");
    expect(modal).toContain("state.processType");
    expect(modal).toContain("bemStatusLabel");
  });
});
