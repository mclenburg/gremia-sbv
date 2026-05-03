import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.47 case workbench data hooks", () => {
  it("adds dedicated case data and search hooks", () => {
    expect(existsSync("src/app/features/cases/useCaseWorkbenchData.ts")).toBe(true);
    expect(existsSync("src/app/features/cases/useCaseWorkbenchSearch.ts")).toBe(true);
    expect(existsSync("src/app/features/cases/useCaseRegisterFilter.ts")).toBe(true);
    expect(existsSync("src/app/features/cases/CaseRegister.tsx")).toBe(true);
  });

  it("moves case register rendering out of workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("useCaseWorkbenchData");
    expect(workflow).toContain("useCaseWorkbenchSearch");
    expect(workflow).toContain("<CaseRegister");
    expect(workflow).not.toContain("<table className=\"industrial-table case-register-table\">");
  });

  it("keeps deep-link handling in the data hook", () => {
    const hook = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");
    expect(hook).toContain("pendingCaseNodeTarget");
    expect(hook).toContain("setSelection({ type: 'process', processType: 'prevention'");
    expect(hook).toContain("onTargetConsumed?.()");
  });

  it("moves fulltext search out of CasesView", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const searchHook = readFileSync("src/app/features/cases/useCaseWorkbenchSearch.ts", "utf8");
    expect(workflow).not.toContain("async function runSearch");
    expect(searchHook).toContain("bridge.cases.search");
  });
});
