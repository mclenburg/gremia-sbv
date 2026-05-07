import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/ui/responsiveDesign.css", "utf8");

describe("RC dropdown design readiness", () => {
  it("styles native select controls as part of the industrial design instead of leaving gray system fallbacks", () => {
    expect(css).toContain("--industrial-select-bg");
    expect(css).toContain("--industrial-select-option-bg");
    expect(css).toContain(".industrial-form select");
    expect(css).toContain(".case-detail-inline-form select");
    expect(css).toContain("appearance: none");
    expect(css).toContain("background-color: var(--industrial-select-bg)");
    expect(css).toContain("padding-right: 2.8rem");
  });

  it("keeps dropdown controls theme-aware in dark and light mode", () => {
    expect(css).toContain("color-scheme: dark");
    expect(css).toContain("html[data-theme='light'] .industrial-form select");
    expect(css).toContain("color-scheme: light");
    expect(css).toContain("html[data-theme='light'] .case-detail-inline-form select");
  });

  it("styles option lists explicitly so opened dropdowns do not fall back to gray lists where the platform allows styling", () => {
    expect(css).toContain(".industrial-form select option");
    expect(css).toContain("background: var(--industrial-select-option-bg)");
    expect(css).toContain("html[data-theme='light'] .industrial-form select option");
  });
});
