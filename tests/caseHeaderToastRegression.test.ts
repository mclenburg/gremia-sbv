import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("case page header and toast regression", () => {
  it("uses compact ModuleFrame on the case page instead of rendering a second large Fälle title", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain('kicker="Arbeitsplatz"');
    expect(app).toContain('description="Fälle"');
    expect(app).toContain("compact");
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
    expect(css).toContain("position: fixed !important");
    expect(css).toContain("z-index: 2147483000");
    expect(css).toContain("top: max(1rem, env(safe-area-inset-top))");
  });
});
