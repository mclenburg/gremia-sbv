import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  processTemplateProcessLabel,
  processTemplateStatusLabel,
  processTemplateStatusTag,
  type ProcessTemplateModalState
} from "../src/app/features/cases/ProcessTemplateDocumentsModal";

const baseState = {
  templates: [],
  loading: false,
  error: undefined,
  info: undefined
};

describe("process template modal status typing", () => {
  it("labels equalization processes from applicationStatus without casts", () => {
    const state: ProcessTemplateModalState = {
      ...baseState,
      processType: "equalization",
      process: {
        id: "eq-1",
        caseId: "case-1",
        applicationStatus: "widerspruch",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    };

    expect(processTemplateProcessLabel(state.processType)).toBe("Gleichstellung / GdB");
    expect(processTemplateStatusLabel(state)).toBe("Widerspruch");
    expect(processTemplateStatusTag(state)).toBe("status:widerspruch");
  });

  it("labels generic process states from status for prevention, BEM and termination", () => {
    const preventionState: ProcessTemplateModalState = {
      ...baseState,
      processType: "prevention",
      process: {
        id: "prev-1",
        caseId: "case-1",
        status: "arbeitgeber_reagiert",
        difficultyType: "organisatorisch",
        riskType: "kuendigung",
        personStatus: "schwerbehindert",
        contactIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    };
    const bemState: ProcessTemplateModalState = {
      ...baseState,
      processType: "bem",
      process: {
        id: "bem-1",
        caseId: "case-1",
        status: "massnahmen_vereinbart",
        title: "BEM",
        triggerType: "sechs_wochen_au",
        employeeResponse: "angenommen",
        contactIds: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    };
    const terminationState: ProcessTemplateModalState = {
      ...baseState,
      processType: "termination_hearing",
      process: {
        id: "term-1",
        caseId: "case-1",
        status: "sbv_anhoerung_offen",
        terminationType: "ordentlich",
        protectionStatus: "schwerbehindert",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z"
      }
    };

    expect(processTemplateStatusLabel(preventionState)).toBe("Arbeitgeber reagiert");
    expect(processTemplateStatusTag(preventionState)).toBe("status:arbeitgeber_reagiert");
    expect(processTemplateStatusLabel(bemState)).toBe("Maßnahmen vereinbart");
    expect(processTemplateStatusTag(bemState)).toBe("status:massnahmen_vereinbart");
    expect(processTemplateStatusLabel(terminationState)).toBe("SBV-Anhörung offen");
    expect(processTemplateStatusTag(terminationState)).toBe("status:sbv_anhoerung_offen");
  });

  it("does not reintroduce unsafe status casts or obsolete type-guard indirection", () => {
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(modal).not.toContain(" as any");
    expect(modal).not.toContain(["function", "isEqualizationProcessRecord"].join(" "));
    expect(modal).not.toContain(["function", "hasGenericProcessStatus"].join(" "));
    expect(modal).toContain("switch (state.processType)");
    expect(modal).toContain("case 'equalization'");
    expect(modal).toContain("state.process.applicationStatus");
  });
});
