import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.5a module boundary import fix", () => {
  it("moves remaining case hooks and report services away from workflowViews utilities", () => {
    const files = [
      "src/app/features/cases/inlineCommands/useInlineCommands.ts",
      "src/app/features/cases/useCaseNoteEditor.ts",
      "src/app/features/cases/useCaseWorkbenchData.ts",
      "src/app/features/cases/useCaseWorkbenchSearch.ts",
      "src/app/features/reports/reportService.ts"
    ];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toContain("workflowViews");
    }
  });

  it("imports the extracted bridge and case-node target modules directly", () => {
    expect(readFileSync("src/app/features/cases/inlineCommands/useInlineCommands.ts", "utf8")).toContain("../../../core/bridge/waitForBridge");
    expect(readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8")).toContain("../../core/navigation/caseNodeTarget");
    expect(readFileSync("src/app/features/reports/reportService.ts", "utf8")).toContain("../../core/bridge/waitForBridge");
  });
});
