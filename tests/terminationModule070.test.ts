import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.0 Kündigungsanhörung module", () => {
  it("keeps postinstall for native Electron dependencies", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.version).toBe("0.7.0");
    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
  });

  it("ships model, service, ipc and bridge for termination hearings", () => {
    const model = readFileSync("src/app/core/models/termination.model.ts", "utf8");
    const service = readFileSync("services/terminationService.ts", "utf8");
    const ipc = readFileSync("electron/ipc/terminationIpc.ts", "utf8");
    const preload = readFileSync("electron/preload.ts", "utf8");
    const vite = readFileSync("src/vite-env.d.ts", "utf8");

    expect(model).toContain("TerminationHearingRecord");
    expect(model).toContain("CreateTerminationHearingInput");
    expect(service).toContain("class TerminationService");
    expect(ipc).toContain("registerTerminationIpc");
    expect(preload).toContain("termination:");
    expect(vite).toContain("termination: {");
  });

  it("activates termination navigation, overview and case-file detail", () => {
    const modules = readFileSync("src/app/core/navigation/modules.ts", "utf8");
    const app = readFileSync("src/app/App.tsx", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const tree = readFileSync("src/app/features/cases/CaseTreePanel.tsx", "utf8");

    expect(modules).toContain("id: 'termination_hearing'");
    expect(modules).not.toContain("termination_hearing',\n    title: 'Kündigungsanhörung',\n    shortTitle: 'Kündigung',\n    text: 'Kündigung, Integrationsamt, Stellungnahme.',\n    icon: Gavel,\n    status: 'planned'");
    expect(app).toContain("TerminationView");
    expect(app).toContain("currentView === 'termination_hearing'");
    expect(workflow).toContain("TerminationProcessDetail");
    expect(workflow).toContain("updateCaseTerminationProcess");
    expect(tree).toContain("terminationProcesses");
  });

  it("adds migration for structured termination hearings", () => {
    const migration = readFileSync("database/migrations/0017_termination_hearings.sql", "utf8");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS termination_hearings");
    expect(migration).toContain("sbv_statement_due_at");
    expect(migration).toContain("integration_office_requested_at");
  });
});
