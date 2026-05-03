import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case workbench density patch", () => {
  it("contains fixed toast styles", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-toast");
    expect(css).toContain("position: fixed");
  });

  it("renders compact case register toolbar", () => {
    const register = readFileSync("src/app/features/cases/CaseRegister.tsx", "utf8");
    expect(register).toContain("case-register-toolbar compact");
    expect(register).toContain("case-register-table-shell");
  });
});
