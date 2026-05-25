import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("P15 Accessibility-Contract", () => {
  it("erzwingt die zentrale Formular-A11y-Verkettung", () => {
    const form = source("src/app/shared/components/IndustrialForm.tsx");
    expect(form).toContain("htmlFor={id}");
    expect(form).toContain("aria-describedby={describedBy}");
    expect(form).toContain("aria-invalid={invalid ? \"true\" : undefined}");
    expect(form).toContain("aria-required={required ? \"true\" : undefined}");
    expect(form).toContain("role=\"alert\"");
    expect(form).toContain("TextCommandTextarea");
  });

  it("erzwingt Button-A11y für Ladezustände und Icon-only-Aktionen", () => {
    const buttons = source("src/app/shared/components/IndustrialButton.tsx");
    expect(buttons).toContain("aria-busy={loading ? \"true\" : ariaBusy}");
    expect(buttons).toContain("aria-label\": string");
    expect(buttons).toContain("type={type}");
    expect(buttons).toContain("disabled={disabled || loading}");
  });

  it("erzwingt zentrale Dialog-A11y mit Modalrolle, Fokuslogik und Live-Region-Ausgabe", () => {
    const dialogs = source("src/app/shared/dialogs/IndustrialDialogs.tsx");
    expect(dialogs).toContain("aria-modal=\"true\"");
    expect(dialogs).toContain("role={role}");
    expect(dialogs).toContain("previousActiveElement");
    expect(dialogs).toContain("focusableElements");
    const liveRegion = source("src/app/shared/a11y/LiveRegionProvider.tsx");
    expect(liveRegion).toContain("industrial-live-region");
  });

  it("sichert Screenreader-Rückmeldungen in den SBV-Ressourcenflows", () => {
    const hook = source("src/app/features/sbv-control/hooks/useSbvResources.ts");
    const logic = source("src/app/features/sbv-control/sbvControlLogic.ts");
    expect(hook).toContain("useAnnouncer");
    expect(logic).toContain("Nachweis wurde protokolliert");
    expect(logic).toContain("Nachweis wurde aktualisiert");
    expect(logic).toContain("Nachweis wurde gelöscht");
  });

  it("hält die E2E-Core-Flows als echte A11y-/Nutzerverhaltensgates aktiv", () => {
    const e2e = source("e2e/core-ui-flows.spec.ts");
    expect(e2e).toContain("focus");
    expect(e2e).toContain("Escape");
    expect(e2e).toContain("industrial-live-region");
    expect(e2e).toContain("inline");
  });
});
