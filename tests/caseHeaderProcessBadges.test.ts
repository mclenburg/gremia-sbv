import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case header and process badge regression", () => {
  it("does not wrap CasesView in ModuleFrame anymore", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).not.toContain('kicker="Arbeitsplatz"');
    expect(app).not.toContain('description="Fälle"');
  });

  it("renders process summary as compact badges instead of metric cards", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain('case-process-badges');
    expect(app).toContain('case-process-badge');
    expect(app).not.toContain('<Metric label="Status"');
  });

  it("styles compact process badges", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain('.case-process-badges');
    expect(css).toContain('.case-process-badge');
  });
});
