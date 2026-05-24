import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("UI-Politur nach P10", () => {
  it("behält das Industrial-Chrome für native Selects in noch nicht vollständig migrierten Modulen", () => {
    const css = source("src/app/ui/responsiveDesign.css");
    const form = source("src/app/shared/components/IndustrialForm.tsx");

    expect(form).toContain("industrial-input industrial-select");
    for (const selector of [
      "select.industrial-input",
      ".template-filter-form select",
      ".template-detail-fields select",
      ".template-create-form select",
      ".person-edit-form select",
    ]) {
      expect(css).toContain(selector);
    }
    expect(css).toContain("--industrial-select-arrow");
    expect(css).toContain("appearance: none");
  });

  it("führt Pflichtfeldmarker inline und zeigt SBV-Nachweisfehler erst nach Interaktion oder Submit", () => {
    const form = source("src/app/shared/components/IndustrialForm.tsx");
    const css = source("src/app/ui/responsiveDesign.css");
    const sbvControl = source("src/app/features/sbv-control/SbvControlView.tsx");

    expect(form).toContain("industrial-field-required-marker");
    expect(css).toContain(".industrial-field-required-marker");
    expect(css).toContain("align-items: baseline");
    expect(sbvControl).toContain("resourceFormSubmitted");
    expect(sbvControl).toContain("resourceTitleTouched");
    expect(sbvControl).toContain("onBlur={() => setResourceTitleTouched(true)}");
    expect(sbvControl).toContain("resourceTitleTouched || resourceFormSubmitted");
  });

  it("entfernt den runden Personen-Lifecycle-Pill-Stil zugunsten harter Industrial-Kanten", () => {
    const css = source("src/app/ui/responsiveDesign.css");
    const badgeBlock = css.slice(
      css.indexOf(".person-lifecycle-badge"),
      css.indexOf(".person-lifecycle-badge.ok"),
    );

    expect(badgeBlock).toContain("border-radius: var(--control-radius)");
    expect(badgeBlock).not.toContain("border-radius: 999px");
    expect(badgeBlock).toContain("text-transform: uppercase");
  });
});
