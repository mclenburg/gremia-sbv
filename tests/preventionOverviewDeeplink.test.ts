import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prevention overview deep-link", () => {
  it("uses reusable process overview components", () => {
    const view = readFileSync("src/app/features/prevention/PreventionView.tsx", "utf8");
    expect(view).toContain("function ProcessOverviewPage");
    expect(view).toContain("function ProcessOverviewGroup");
    expect(view).toContain("function ProcessOverviewCard");
    expect(view).toContain("groupProcessOverviewRecords");
  });

  it("turns PreventionView into overview-only navigation", () => {
    const view = readFileSync("src/app/features/prevention/PreventionView.tsx", "utf8");
    expect(view).toContain("onOpenCaseNode");
    expect(view).toContain("Die Bearbeitung erfolgt ausschließlich in der Fallakte.");
    expect(view).not.toContain("Präventionsverfahren anlegen");
    expect(view).not.toContain("updateSelected(input: UpdatePreventionProcessInput)");
  });

  it("prepares deep linking into the case workbench", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const hook = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");
    expect(workflow).toContain("type CaseNodeTarget");
    expect(app).toContain("function openCaseNode(target: CaseNodeTarget)");
    expect(hook).toContain("setSelection({ type: 'process', processType: 'prevention', id: pendingCaseNodeTarget.nodeId })");
  });

  it("loads process overview styles", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/processOverview.css", "utf8");
    expect(app).toContain("import './processOverview.css';");
    expect(css).toContain(".process-overview-group");
    expect(css).toContain(".process-overview-card");
  });
});
