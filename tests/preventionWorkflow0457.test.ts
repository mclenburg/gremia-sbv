import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.4.57 prevention workflow contracts", () => {
  it("keeps prevention detail status sections in the specialist component", () => {
    const component = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");

    for (const label of [
      "Prüfung und Ausgangslage",
      "Anforderung an den Arbeitgeber",
      "Reaktion des Arbeitgebers",
      "Maßnahmenklärung und Umsetzung",
      "Ergebnis / Abschluss"
    ]) {
      expect(component).toContain(label);
    }
  });

  it("does not show employer reaction before the request status is reached", () => {
    const component = readFileSync("src/app/features/prevention/PreventionProcessDetail.tsx", "utf8");

    expect(component).toContain("canShowEmployerReactionSection");
    expect(component).toContain("preventionStatusReached(status, 'arbeitgeber_reagiert')");
    expect(component).toContain("preventionStatusReached(process.status, 'angefordert')");
  });

  it("wires prevention overview clicks into the case workbench node target", () => {
    const preventionView = readFileSync("src/app/features/prevention/PreventionView.tsx", "utf8");
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(preventionView).toContain("onOpenCaseNode");
    expect(workflow).toContain("onOpenCaseNode");
    expect(workflow).toContain("nodeType");
  });

  it("offers process documents through status-bound templates", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");
    const modal = readFileSync("src/app/features/cases/ProcessTemplateDocumentsModal.tsx", "utf8");

    expect(workflow).toContain("massnahme:prevention");
    expect(workflow).toContain("status:");
    expect(modal).toContain("Dokumente zur Maßnahme");
    expect(modal).toContain("status:${state.process.status}");
  });
});
