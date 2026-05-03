import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case page header and toast regression", () => {
  it("keeps the case page compact without a second large title", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    expect(workflow).toContain("<ModuleFrame");
    expect(workflow).toContain("compact");
    expect(workflow).not.toContain("<h1>Fälle</h1>");
  });

  it("supports compact ModuleFrame rendering", () => {
    const frame = readFileSync("src/app/shared/components/ModuleFrame.tsx", "utf8");
    expect(frame).toContain("compact?: boolean");
    expect(frame).toContain("industrial-hero-compact");
    expect(frame).toContain("title ? <h1>{title}</h1> : null");
  });

  it("forces case toast into the visible viewport", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-toast");
    expect(css).toContain("position: fixed");
    expect(css).toContain("z-index: 2147483000");
    expect(css).toContain("safe-area-inset-top");
  });
});
