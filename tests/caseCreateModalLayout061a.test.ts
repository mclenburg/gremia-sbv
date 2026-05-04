import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1a case create modal responsive layout", () => {
  it("does not use horizontal scrolling for the create-case overlay", () => {
    const modal = readFileSync("src/app/features/cases/CaseCreateModal.tsx", "utf8");
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");

    expect(modal).toContain("case-create-modal-responsive");
    expect(modal).not.toContain("case-create-modal-scroll");

    expect(css).toContain(".case-create-modal-responsive");
    expect(css).toContain("overflow-x: hidden");
    expect(css).toContain("grid-template-columns: repeat(auto-fit");
    expect(css).toContain("min-width: 0");

    expect(css).not.toContain(".case-create-modal-scroll");
    expect(css).not.toContain("overflow-x: auto");
    expect(css).not.toContain("min-width: 42rem");
  });
});
