import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1 case create modal scroll", () => {
  it("restores horizontal scrolling for the create-case overlay", () => {
    const modal = readFileSync("src/app/features/cases/CaseCreateModal.tsx", "utf8");
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");

    expect(modal).toContain("case-create-modal-scroll");
    expect(css).toContain(".case-create-modal-scroll");
    expect(css).toContain("overflow-x: auto");
    expect(css).toContain("min-width: 42rem");
  });
});
