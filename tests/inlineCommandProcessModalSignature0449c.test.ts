import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.49c process modal signature fix", () => {
  it("uses the existing CaseProcessDraftModal prop contract", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const start = workflow.indexOf("<CaseProcessDraftModal");
    const end = workflow.indexOf("/>", start);
    const call = workflow.slice(start, end);

    expect(call).toContain("draft={caseProcessDraft}");
    expect(call).toContain("onChange={(nextDraft) => setCaseProcessDraft(nextDraft)}");
    expect(call).toContain("onCreate={() => void createCaseProcessFromDraft()}");
    expect(call).not.toContain("selectedCase=");
    expect(call).not.toContain("onSubmit=");
  });
});
