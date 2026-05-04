import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.1 case register pagination", () => {
  it("limits the visible case table to five records per page", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const register = readFileSync("src/app/features/cases/CaseRegister.tsx", "utf8");

    expect(workflow).toContain("const caseRegisterPageSize = 5");
    expect(workflow).toContain("filteredCases.slice((normalizedCaseRegisterPage - 1) * caseRegisterPageSize, normalizedCaseRegisterPage * caseRegisterPageSize)");
    expect(register).toContain("maximal {pageSize} Fälle pro Seite");
    expect(register).toContain("onPageChange(page - 1)");
    expect(register).toContain("onPageChange(page + 1)");
  });
});
