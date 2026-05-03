import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.0 Gleichstellung / GdB module", () => {
  it("activates equalization navigation and views", () => {
    const modules = readFileSync("src/app/core/navigation/modules.ts", "utf8");
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(modules).toContain("title: 'Gleichstellung / GdB'");
    expect(modules).not.toContain("id: 'equalization',\n    title: 'Gleichstellung',\n    shortTitle: 'Gleichstellung',\n    text: 'Antrag, Sachstand, Bescheid, Widerspruchsfrist.',\n    icon: Scale,\n    status: 'planned'");
    expect(app).toContain("EqualizationView");
    expect(app).toContain("currentView === 'equalization'");
  });

  it("provides equalization IPC, preload bridge and window typings", () => {
    const main = readFileSync("electron/main.ts", "utf8");
    const preload = readFileSync("electron/preload.ts", "utf8");
    const vite = readFileSync("src/vite-env.d.ts", "utf8");

    expect(main).toContain("registerEqualizationIpc");
    expect(preload).toContain("equalization:");
    expect(preload).toContain("equalization:create");
    expect(vite).toContain("equalization: {");
    expect(vite).toContain("UpdateEqualizationProcessInput");
  });

  it("integrates equalization into the case workbench", () => {
    const footer = readFileSync("src/app/features/cases/CaseWorkbenchFooter.tsx", "utf8");
    const tree = readFileSync("src/app/features/cases/CaseTreePanel.tsx", "utf8");
    const data = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(footer).toContain("onProcess('equalization')");
    expect(footer).toContain("industrial-button");
    expect(tree).toContain("equalizationProcesses");
    expect(data).toContain("bridge.equalization?.list");
    expect(workflow).toContain("EqualizationProcessDetail");
    expect(workflow).toContain("updateCaseEqualizationProcess");
  });

  it("ships equalization model, service and guidance policy", () => {
    const model = readFileSync("src/app/core/models/equalization.model.ts", "utf8");
    const service = readFileSync("services/equalizationService.ts", "utf8");
    const policy = readFileSync("services/equalizationWorkflowPolicy.ts", "utf8");

    expect(model).toContain("CreateEqualizationProcessInput");
    expect(model).toContain("UpdateEqualizationProcessInput");
    expect(service).toContain("list(caseId?: string)");
    expect(service).toContain("update(id: string");
    expect(policy).toContain("evaluateEqualizationWarnings");
  });
});
