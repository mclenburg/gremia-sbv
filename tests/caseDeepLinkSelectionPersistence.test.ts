import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case deep link selection persistence", () => {
  it("does not rerun the case-child loading effect after consuming the pending target", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("pendingCaseNodeTarget?.caseId === selectedCaseId");
    expect(app).toContain("setSelection({ type: 'process', processType: 'prevention', id: pendingCaseNodeTarget.nodeId })");
    expect(app).toContain("setPendingCaseNodeTarget(null)");
    expect(app).toContain("onTargetConsumed?.()");
    expect(app).toContain("}, [selectedCaseId]);");
    expect(app).not.toContain("}, [selectedCaseId, pendingCaseNodeTarget, onTargetConsumed]);");
  });
});
