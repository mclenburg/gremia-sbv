import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("knowledge workbench advisor", () => {
  it("adds local SBV advisor knowledge entries for fulltext search", () => {
    const view = readFileSync("src/app/features/knowledge/KnowledgeView.tsx", "utf8");
    expect(view).toContain("SBV_ADVISOR_KNOWLEDGE_ENTRIES");
    expect(view).toContain("§ 178 Abs. 2 SGB IX");
    expect(view).toContain("§ 167 Abs. 1 SGB IX");
    expect(view).toContain("§ 5 ArbSchG");
    expect(view).toContain("filterKnowledgeNorms");
  });

  it("uses fulltext filtering across norm fields", () => {
    const view = readFileSync("src/app/features/knowledge/KnowledgeView.tsx", "utf8");
    expect(view).toContain("knowledgeSearchText");
    expect(view).toContain("shortText");
    expect(view).toContain("practiceNote");
    expect(view).toContain("typicalCases");
    expect(view).toMatch(/filterKnowledgeNorms|filteredKnowledgeNorms|\.filter\(/);
  });

  it("makes the register left-aligned and advisor-focused", () => {
    const view = readFileSync("src/app/features/knowledge/KnowledgeView.tsx", "utf8");
    const css = readFileSync("src/app/knowledgeWorkbench.css", "utf8");
    expect(view).toContain("knowledge-register-row");
    expect(view).toContain("knowledge-search-bar");
    expect(css).toContain("text-align: left");
    expect(css).toContain(".knowledge-register-row strong");
  });
});
