import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1d process template modal type guards", () => {
  it("uses type guards before accessing process status fields", () => {
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(modal).toContain("function isEqualizationProcessRecord");
    expect(modal).toContain("'applicationStatus' in process");
    expect(modal).toContain("function hasGenericProcessStatus");
    expect(modal).toContain("'status' in process");
    expect(modal).toContain("isEqualizationProcessRecord(state.process)");
    expect(modal).toContain("hasGenericProcessStatus(state.process)");
  });
});
