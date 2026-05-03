import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case toast typing regression", () => {
  it("declares CaseToast type used by the case workbench", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("type CaseToast =");
    expect(app).toContain("useState<CaseToast | null>");
  });

  it("keeps toast feedback fixed in the viewport", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-toast");
    expect(css).toContain("position: fixed");
  });
});
