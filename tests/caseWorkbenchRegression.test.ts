import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case workbench regression fixes", () => {
  it("keeps CaseToast declared for the toast state", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("type CaseToast =");
    expect(workflow).toContain("useState<CaseToast | null>");
  });

  it("keeps the responsive prevention form layout", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-detail-inline-form .industrial-form-grid");
    expect(css).toContain("repeat(auto-fit, minmax(15rem, 1fr))");
    expect(css).toContain(".case-detail-inline-form input");
    expect(css).toContain("box-sizing: border-box");
  });

  it("keeps the fixed toast response overlay", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-toast");
    expect(css).toContain("position: fixed");
    expect(css).toContain("top:");
  });

  it("adds the Electron native dependency rebuild postinstall hook", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    expect(packageJson.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
