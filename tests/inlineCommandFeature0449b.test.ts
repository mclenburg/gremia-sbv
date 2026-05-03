import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.49b inline command extraction repair", () => {
  it("keeps the case process draft modal out of inline command overlays", () => {
    const inline = readFileSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx", "utf8");
    expect(inline).not.toContain("CaseProcessDraftModal");
    expect(inline).not.toContain("caseProcessDraft");
    expect(inline).not.toContain("setCaseProcessDraft");
    expect(inline).not.toContain("createCaseProcessFromDraft");
  });

  it("keeps the case process draft modal in workflowViews where its state still lives", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("<CaseProcessDraftModal");
    expect(workflow).toContain("draft={caseProcessDraft}");
    expect(workflow).toContain("onCreate={() => void createCaseProcessFromDraft()}");
    expect(workflow).toContain("<InlineCommandOverlays");
  });
});
