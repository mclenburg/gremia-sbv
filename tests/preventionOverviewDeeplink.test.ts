import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("prevention overview deep-link", () => {
  it("uses reusable process overview components", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("function ProcessOverviewPage");
    expect(app).toContain("function ProcessOverviewGroup");
    expect(app).toContain("function ProcessOverviewCard");
    expect(app).toContain("groupProcessOverviewRecords");
  });

  it("turns PreventionView into overview-only navigation", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("onOpenCaseNode");
    expect(app).toContain("Die Bearbeitung erfolgt ausschließlich in der Fallakte.");
    expect(app).not.toContain("Präventionsverfahren anlegen");
    expect(app).not.toContain("updateSelected(input: UpdatePreventionProcessInput)");
  });

  it("prepares deep linking into the case workbench", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("type CaseNodeTarget");
    expect(app).toContain("function openCaseNode(target: CaseNodeTarget)");
    expect(app).toContain("setSelection({ type: 'process', processType: 'prevention', id: pendingCaseNodeTarget.nodeId })");
  });

  it("loads process overview styles", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/processOverview.css", "utf8");
    expect(app).toContain("import './processOverview.css';");
    expect(css).toContain(".process-overview-group");
    expect(css).toContain(".process-overview-card");
  });
});
