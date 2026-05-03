import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.5.0 BEM module structure", () => {
  it("adds BEM model, migration, service and IPC", () => {
    expect(existsSync("src/app/core/models/bem.model.ts")).toBe(true);
    expect(existsSync("database/migrations/0015_bem_process.sql")).toBe(true);
    expect(existsSync("services/bemService.ts")).toBe(true);
    expect(existsSync("services/bemWorkflowPolicy.ts")).toBe(true);
    expect(existsSync("electron/ipc/bemIpc.ts")).toBe(true);
  });

  it("registers BEM in preload and main process", () => {
    const preload = readFileSync("electron/preload.ts", "utf8");
    const main = readFileSync("electron/main.ts", "utf8");

    expect(preload).toContain("bem: {");
    expect(preload).toContain("ipcRenderer.invoke('bem:list'");
    expect(preload).toContain("CreateBemProcessInput");
    expect(main).toContain("registerBemIpc");
  });

  it("activates the BEM dashboard module", () => {
    const modules = readFileSync("src/app/core/navigation/modules.ts", "utf8");
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(modules).toContain("id: 'bem'");
    expect(modules).not.toContain("plannedVersion: '0.5.x'");
    expect(app).toContain("<BemView cases={cases} onOpenCaseNode={openCaseNode} />");
  });
});
