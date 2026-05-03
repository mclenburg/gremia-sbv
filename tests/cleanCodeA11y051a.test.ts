import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.1a clean-code a11y build fix", () => {
  it("imports inline command draft types and keeps callbacks typed", () => {
    const source = readFileSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx", "utf8");

    expect(source).toContain("import type { InlineAnonymizationDraft");
    expect(source).toContain("InlineCaseLinkDraft");
    expect(source).toContain("type Setter<T> = (updater: (current: T | null) => T | null) => void;");
    expect(source).not.toContain("current: any");
  });

  it("announces CaseToast using the real CaseToast fields", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("caseToast?.text");
    expect(workflow).toContain("caseToast.variant === 'warning'");
    expect(workflow).not.toContain("caseToast?.message");
    expect(workflow).not.toContain("caseToast.kind");
  });
});
