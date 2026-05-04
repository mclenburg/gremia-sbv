import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.3 Kündigungsanhörung Datenschutz und Export", () => {
  it("uses termination-specific export context before downloading documents", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("buildTerminationExportContext");
    expect(workflow).toContain("terminationPrivacyExportNotice");
    expect(workflow).toContain("context: 'Kündigungsanhörung-Export'");
    expect(workflow).toContain("Kündigungsdokument exportieren?");
  });

  it("shows a privacy warning in the termination detail form", () => {
    const detail = readFileSync("src/app/features/termination/TerminationProcessDetail.tsx", "utf8");

    expect(detail).toContain("Kündigungsdaten sind vertraulich");
    expect(detail).toContain("Gesundheits-, Leistungs- oder Verhaltensdaten");
    expect(detail).toContain("Exporte nur mit Zweckbindung");
  });
});
