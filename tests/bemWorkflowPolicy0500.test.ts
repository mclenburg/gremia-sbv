import { describe, expect, it } from "vitest";
import { BEM_STATUS_ORDER, bemStatusLabel, defaultBemResponseDueAt, evaluateBemWarnings } from "../services/bemWorkflowPolicy";
import type { BemProcessRecord } from "../src/app/core/models/bem.model";

function baseBemProcess(patch: Partial<BemProcessRecord> = {}): BemProcessRecord {
  return {
    id: "bem-1",
    caseId: "case-1",
    status: "zu_pruefen",
    title: "BEM-Verfahren",
    triggerType: "sechs_wochen_au",
    employeeResponse: "offen",
    contactIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch
  };
}

describe("0.5.0 BEM workflow policy", () => {
  it("defines the expected BEM status order", () => {
    expect(BEM_STATUS_ORDER).toContain("angebot_versendet");
    expect(BEM_STATUS_ORDER).toContain("reaktion_abwarten");
    expect(BEM_STATUS_ORDER).toContain("massnahmen_vereinbart");
    expect(BEM_STATUS_ORDER).toContain("wirksamkeit_pruefen");
    expect(bemStatusLabel("abgeschlossen")).toBe("abgeschlossen");
  });

  it("calculates the default BEM response deadline", () => {
    expect(defaultBemResponseDueAt("2026-01-01T00:00:00.000Z")).toBe("2026-01-15T00:00:00.000Z");
  });

  it("warns if the BEM trigger exists but no offer is documented", () => {
    const warnings = evaluateBemWarnings(baseBemProcess({ sicknessDaysTwelveMonths: 42 }));
    expect(warnings.some((warning) => warning.level === "critical" && warning.message.includes("BEM-Auslöser"))).toBe(true);
  });

  it("warns about overdue response and missing review", () => {
    const warnings = evaluateBemWarnings(baseBemProcess({
      status: "massnahmen_vereinbart",
      responseDueAt: "2026-01-01T00:00:00.000Z",
      measures: "Arbeitszeit anpassen"
    }), new Date("2026-01-20T00:00:00.000Z"));

    expect(warnings.some((warning) => warning.message.includes("Reaktionsfrist"))).toBe(true);
    expect(warnings.some((warning) => warning.message.includes("Wirksamkeitsprüfung"))).toBe(true);
  });
});
