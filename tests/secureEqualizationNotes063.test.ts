import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.3 secure equalization notes", () => {
  it("does not persist new equalization notes in the equalization table service", () => {
    const service = readFileSync("services/equalizationService.ts", "utf8");

    expect(service).toContain("legacyPlaintextNotesPresent");
    expect(service).toContain("notes: undefined");
    expect(service).toContain("null,\n      timestamp");
    expect(service).not.toContain("input.notes ?? null");
    expect(service).not.toContain("next.notes ?? null");
  });

  it("stores new equalization notes as high-sensitive case notes", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("createEqualizationSecureNote");
    expect(workflow).toContain("[[equalization:${process.id}]]");
    expect(workflow).toContain("containsHealthData: true");
    expect(workflow).toContain("confidentialLevel: 'hoch_sensibel'");
    expect(workflow).toContain("selectedEqualizationNotes");
  });

  it("renders equalization notes through the secure case-note path", () => {
    const detail = readFileSync("src/app/features/equalization/EqualizationProcessDetail.tsx", "utf8");

    expect(detail).toContain("Verschlüsselte SBV-Notizen");
    expect(detail).toContain("secureNotes");
    expect(detail).toContain("onCreateSecureNote");
    expect(detail).toContain("equalization-secure-note");
    expect(detail).not.toContain("onUpdate(process.id, { notes:");
  });
});
