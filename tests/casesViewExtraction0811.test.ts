import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const casesView = readFileSync("src/app/features/cases/CasesView.tsx", "utf8");

describe("0.8.11 CasesView extraction", () => {
  it("ships the target cases view module structure", () => {
    expect(existsSync("src/app/features/cases/CasesView.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CasesViewLayout.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CasesViewHeader.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/CasesViewToolbar.tsx")).toBe(true);
    expect(existsSync("src/app/features/cases/casesViewTypes.ts")).toBe(true);
    expect(existsSync("src/app/features/cases/casesViewUtils.ts")).toBe(true);
  });

  it("keeps CasesView outside the workflowViews monolith", () => {
    expect(casesView).toContain("export function CasesView");
    expect(casesView).toContain("}: CasesViewProps)");
    expect(casesView).toContain("./casesViewTypes");
    expect(casesView).toContain("./casesViewUtils");
    expect(casesView).not.toContain("../workflowViews");
    expect(casesView).not.toContain("../../workflowViews");
  });
});
