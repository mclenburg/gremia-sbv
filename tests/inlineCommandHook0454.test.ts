import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.54 useInlineCommands extraction", () => {
  it("adds a dedicated inline command hook", () => {
    expect(existsSync("src/app/features/cases/inlineCommands/useInlineCommands.ts")).toBe(true);
    const hook = readFileSync("src/app/features/cases/inlineCommands/useInlineCommands.ts", "utf8");
    expect(hook).toContain("export function useInlineCommands");
    expect(hook).toContain("handleProtocolTextChange");
    expect(hook).toContain("createInlineDeadlineFromProtocol");
    expect(hook).toContain("createAndInsertContactFromProtocol");
    expect(hook).toContain("insertLegalNormFromProtocol");
    expect(hook).toContain("overlayProps");
  });

  it("removes inline command state and handlers from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("useInlineCommands");
    expect(workflow).toContain("inlineCommands.handleProtocolTextChange");
    expect(workflow).toContain("{...inlineCommands.overlayProps}");
    expect(workflow).not.toContain("const [inlineDeadlineDraft");
    expect(workflow).not.toContain("function openInlineCommand");
    expect(workflow).not.toContain("function createInlineDeadlineFromProtocol");
    expect(workflow).not.toContain("function insertLegalNormFromProtocol");
  });

  it("keeps manual case deadline creation in the hook", () => {
    const hook = readFileSync("src/app/features/cases/inlineCommands/useInlineCommands.ts", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(hook).toContain("function openCaseDeadlineDraft");
    expect(workflow).toContain("onDeadline={inlineCommands.openCaseDeadlineDraft}");
    expect(workflow).not.toContain("setInlineDeadlineDraft({");
  });
});
