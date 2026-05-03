import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

describe("0.5.5 module boundaries", () => {
  it("moves bridge and date utilities out of workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const bridge = readFileSync("src/app/core/bridge/waitForBridge.ts", "utf8");
    const dates = readFileSync("src/app/shared/format/dates.ts", "utf8");

    expect(bridge).toContain("export async function waitForBridge");
    expect(dates).toContain("export function formatDateShort");
    expect(workflow).not.toContain("export async function waitForBridge");
    expect(workflow).not.toContain("export function formatDateShort");
  });

  it("moves CaseNodeTarget into the navigation boundary", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const target = readFileSync("src/app/core/navigation/caseNodeTarget.ts", "utf8");

    expect(target).toContain("export type CaseNodeTarget");
    expect(target).toContain("CaseProcessType");
    expect(workflow).not.toContain("export type CaseNodeTarget");
  });

  it("keeps all feature modules from importing utilities from workflowViews", () => {
    const offenders = sourceFiles("src/app/features").filter((file) => {
      const source = readFileSync(file, "utf8");
      return source.includes("workflowViews") && (
        source.includes("waitForBridge")
        || source.includes("CaseNodeTarget")
        || source.includes("formatDateShort")
      );
    });

    expect(offenders).toEqual([]);

    const bem = readFileSync("src/app/features/bem/BemView.tsx", "utf8");
    expect(bem).toContain("../../core/bridge/waitForBridge");
    expect(bem).toContain("../../shared/format/dates");
  });
});
