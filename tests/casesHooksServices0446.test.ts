import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.46 case hooks and services preparation", () => {
  it("fixes optional document size handling in the case tree type", () => {
    const types = readFileSync("src/app/features/cases/caseWorkbenchTypes.ts", "utf8");
    expect(types).toContain("formatBytes: (value?: number) => string");
  });

  it("uses an HTMLFormElement-compatible search submit type", () => {
    const types = readFileSync("src/app/features/cases/caseWorkbenchTypes.ts", "utf8");
    const detail = readFileSync("src/app/features/cases/CaseDetailPanel.tsx", "utf8");
    expect(types).toContain("FormEvent<HTMLFormElement>");
    expect(detail).toContain("void onSearchSubmit(event)");
    expect(detail).not.toContain("FormEvent) => onSearchSubmit");
  });

  it("moves stateless case formatting helpers into a feature utility module", () => {
    expect(existsSync("src/app/features/cases/caseWorkbenchFormat.ts")).toBe(true);
    const format = readFileSync("src/app/features/cases/caseWorkbenchFormat.ts", "utf8");
    expect(format).toContain("export function formatBytes");
    expect(format).toContain("export function formatNoteDate");
    expect(format).toContain("export function processTypeLabel");
  });

  it("removes extracted formatting helpers from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("caseWorkbenchFormat");
    expect(workflow).not.toContain("function formatBytes(bytes?");
    expect(workflow).not.toContain("function processTypeLabel(processType");
  });
});
