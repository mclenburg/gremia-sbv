import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("knowledge workbench advisor", () => {
  it("adds local SBV advisor knowledge entries for fulltext search", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("SBV_ADVISOR_KNOWLEDGE_ENTRIES");
    expect(app).toContain("§ 178 Abs. 2 SGB IX");
    expect(app).toContain("§ 167 Abs. 1 SGB IX");
    expect(app).toContain("§ 5 ArbSchG");
    expect(app).toContain("filterKnowledgeNorms");
  });

  it("uses fulltext filtering across norm fields", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("knowledgeSearchText");
    expect(app).toContain("term.every");
    expect(app).toContain("shortText");
    expect(app).toContain("practiceNote");
    expect(app).toContain("typicalCases");
  });

  it("makes the register left-aligned and advisor-focused", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    const css = readFileSync("src/app/knowledgeWorkbench.css", "utf8");
    expect(app).toContain("knowledge-register-row");
    expect(app).toContain("knowledge-search-bar");
    expect(css).toContain("text-align: left");
    expect(css).toContain(".knowledge-register-row strong");
  });
});
