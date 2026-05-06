import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync("src/app/App.tsx", "utf8");
const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
const casesView = readFileSync("src/app/features/cases/CasesView.tsx", "utf8");

describe("0.8.11 case workbench wiring regression", () => {
  it("keeps the public workflowViews import contract stable for App", () => {
    expect(app).toContain("CasesView");
    expect(app).toContain('from "./workflowViews"');
    expect(workflow).toContain("CasesView");
    expect(workflow).toContain("DashboardOverview");
    expect(workflow).toContain("SettingsView");
  });

  it("keeps existing case workbench components wired in the extracted module", () => {
    expect(casesView).toContain("CaseDetailPanel");
    expect(casesView).toContain("CaseWorkbenchFooter");
    expect(casesView).toContain("CaseRegister");
    expect(casesView).toContain("CaseTreePanel");
    expect(casesView).toContain("CaseCreateModal");
  });
});
