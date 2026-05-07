import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/ui/responsiveDesign.css", "utf8");

function expectCssRule(selector: string, declarations: string[]) {
  expect(css, `${selector} fehlt in responsiveDesign.css`).toContain(selector);
  for (const declaration of declarations) {
    expect(css, `${selector} muss ${declaration} setzen`).toContain(declaration);
  }
}

describe("RC layout readiness for process and measure detail masks", () => {
  it("uses available space for process headers, badges and section bodies without fixed-width overlap traps", () => {
    expectCssRule(".case-process-header", [
      "grid-template-columns: minmax(0, 1fr) auto",
      "min-width: 0",
    ]);
    expectCssRule(".case-process-badges", [
      "flex-wrap: wrap",
      "max-width: min(38rem, 48vw)",
    ]);
    expectCssRule(".prevention-status-section", [
      "display: grid",
      "min-width: 0",
    ]);
    expectCssRule(".bem-status-sections > section", [
      "display: grid",
      "min-width: 0",
    ]);
  });

  it("keeps process form controls responsive and readable in dark and light mode", () => {
    expectCssRule(".case-detail-inline-form input", [
      "width: 100%",
      "min-width: 0",
      "min-height: var(--control-min-height, 2.5rem)",
    ]);
    expect(css).toContain(".case-detail-inline-form select");
    expect(css).toContain(".case-detail-inline-form textarea");
    expect(css).toContain("html[data-theme='light'] .case-detail-inline-form input");
    expect(css).toContain("html[data-theme='light'] .case-detail-inline-form textarea");
  });

  it("lays out workplace-accommodation checkbox groups as a responsive grid", () => {
    expectCssRule(".industrial-checkbox-grid", [
      "display: grid",
      "grid-template-columns: repeat(auto-fit, minmax(min(15rem, 100%), 1fr))",
      "min-width: 0",
    ]);
    expect(css).toContain(".industrial-checkbox-grid .industrial-checkbox-row label");
    expect(css).toContain("overflow-wrap: anywhere");
  });

  it("collapses process headers and form grids before they can overlap on narrow desktop viewports", () => {
    expect(css).toContain("@media (max-width: 1100px)");
    expect(css).toContain(".case-process-header {");
    expect(css).toContain("grid-template-columns: 1fr");
    expect(css).toContain("@media (max-width: 900px)");
    expect(css).toContain(".case-detail-inline-form .industrial-form-grid-3");
  });
});
