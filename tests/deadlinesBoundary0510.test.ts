import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.5.10 deadlines boundary", () => {
  it("extracts DeadlinesView and DeadlineEditor from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const deadlines = readFileSync("src/app/features/deadlines/DeadlinesView.tsx", "utf8");

    expect(existsSync("src/app/features/deadlines/DeadlinesView.tsx")).toBe(true);
    expect(deadlines).toContain("export function DeadlinesView");
    expect(deadlines).toContain("export function DeadlineEditor");
    expect(workflow).not.toContain("export function DeadlinesView");
    expect(workflow).not.toContain("export function DeadlineEditor");
  });

  it("keeps App wired to the extracted deadlines feature", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");

    expect(app).toContain("import { DeadlinesView, DeadlineEditor } from './features/deadlines/DeadlinesView'");
    expect(app).not.toContain("DeadlinesView,\n  DeadlineEditor");
  });

  it("keeps postinstall for native Electron dependencies", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));

    expect(pkg.version).toBe("0.5.10");
    expect(pkg.scripts.postinstall).toBe("electron-builder install-app-deps");
  });
});
