import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.49 inline command feature extraction", () => {
  it("adds an inline command feature bundle", () => {
    expect(existsSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/inlineCommands/inlineCommandSearch.ts")).toBe(true);
    const component = readFileSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx", "utf8");
    expect(component).toContain("export function InlineCommandOverlays");
    expect(component).toContain("Inline-Fallbezug");
    expect(component).toContain("Inline-Rechtsnorm");
    expect(component).toContain("Inline-Frist");
  });

  it("removes the large inline overlay JSX from workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("<InlineCommandOverlays");
    expect(workflow).not.toContain("<InlineCommandOverlaysBoundary");
    expect(workflow).not.toContain("id=\"inline-case-link-title\"");
    expect(workflow).not.toContain("function filterCasesForQuery");
    expect(workflow).not.toContain("function filterNormsForQuery");
  });

  it("keeps search helpers in the inline command feature", () => {
    const search = readFileSync("src/app/features/cases/inlineCommands/inlineCommandSearch.ts", "utf8");
    expect(search).toContain("filterCasesForInlineCommand");
    expect(search).toContain("filterNormsForInlineCommand");
    expect(search).toContain("hasAnyInlineCommandOverlay");
  });

  it("keeps the old import path as a re-export", () => {
    const reexport = readFileSync("src/app/features/cases/InlineCommandOverlays.tsx", "utf8");
    expect(reexport).toContain("export { InlineCommandOverlays } from './inlineCommands/InlineCommandOverlays';");
  });
});
