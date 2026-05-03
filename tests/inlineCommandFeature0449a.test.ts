import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.4.49a inline command feature extraction", () => {
  it("adds an inline command feature bundle", () => {
    expect(existsSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/inlineCommands/inlineCommandSearch.ts")).toBe(true);
    const component = readFileSync("src/app/features/cases/inlineCommands/InlineCommandOverlays.tsx", "utf8");
    expect(component).toContain("export function InlineCommandOverlays");
    expect(component).toContain("Inline-Fallbezug");
    expect(component).toContain("Inline-Rechtsnorm");
    expect(component).toContain("Inline-Frist");
  });

  it("replaces inline overlay JSX in workflowViews without breaking the CasesView return", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("<InlineCommandOverlays");
    expect(workflow).not.toContain("<InlineCommandOverlaysBoundary");
    expect(workflow).not.toContain("id=\"inline-case-link-title\"");
    expect(workflow).toContain("      />\n    </>\n  );\n}\n\nexport function DeadlinesView");
  });

  it("moves inline search helpers out of workflowViews", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const search = readFileSync("src/app/features/cases/inlineCommands/inlineCommandSearch.ts", "utf8");
    expect(workflow).not.toContain("function filterCasesForQuery");
    expect(workflow).not.toContain("function filterNormsForQuery");
    expect(search).toContain("filterCasesForInlineCommand");
    expect(search).toContain("filterNormsForInlineCommand");
    expect(search).toContain("hasAnyInlineCommandOverlay");
  });
});
