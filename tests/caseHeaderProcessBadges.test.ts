import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case header and process badge regression", () => {
  it("does not wrap CasesView in a large duplicate ModuleFrame title", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).not.toContain('<h1>Fälle</h1>');
  });

  it("renders process summary as compact badges instead of metric cards", () => {
    const detail = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");
    expect(detail).toContain("case-process-badges");
    expect(detail).toContain("case-process-badge");
    expect(detail).not.toContain('<Metric label="Status"');
  });

  it("styles compact process badges", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-process-badges");
    expect(css).toContain(".case-process-badge");
  });
});
