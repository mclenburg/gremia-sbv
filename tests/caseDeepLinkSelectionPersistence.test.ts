import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case deep link selection persistence", () => {
  it("does not rerun the case-child loading effect after consuming the pending target", () => {
    const hook = readFileSync("src/app/features/cases/useCaseWorkbenchData.ts", "utf8");
    expect(hook).toContain("pendingCaseNodeTarget?.caseId === selectedCaseId");
    expect(hook).toContain("setSelection({ type: 'process', processType: 'prevention', id: pendingCaseNodeTarget.nodeId })");
    expect(hook).toContain("setPendingCaseNodeTarget(null)");
    expect(hook).toContain("onTargetConsumed?.()");
    expect(hook).toContain("}, [selectedCaseId]);");
    expect(hook).not.toContain("}, [selectedCaseId, pendingCaseNodeTarget, onTargetConsumed]);");
  });
});
