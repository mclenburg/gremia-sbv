import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("ModuleFrame compact contract", () => {
  it("declares compact in ModuleFrameProps", () => {
    const frame = readFileSync("src/app/shared/components/ModuleFrame.tsx", "utf8");
    expect(frame).toContain("compact?: boolean");
    expect(frame).toContain("compact = false");
    expect(frame).toContain("industrial-hero-compact");
  });

  it("keeps the case page compact usage", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toContain("compact");
    expect(app).toContain('description="Fälle"');
  });

  it("keeps toast and responsive workbench styles", () => {
    const css = readFileSync("src/app/caseWorkbench.css", "utf8");
    expect(css).toContain(".case-toast");
    expect(css).toContain("position: fixed");
    expect(css).toContain(".case-detail-inline-form .industrial-form-grid");
  });
});
