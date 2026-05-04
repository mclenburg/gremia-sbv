import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.2 Kündigungsanhörung fachliche Härtung", () => {
  it("adds deadline suggestion and near-deadline warnings to the policy", () => {
    const policy = readFileSync("services/terminationWorkflowPolicy.ts", "utf8");

    expect(policy).toContain("suggestedStatementDueAt");
    expect(policy).toContain("isExtraordinaryTermination");
    expect(policy).toContain("setDate(due.getDate() + (isExtraordinaryTermination(terminationType) ? 3 : 7))");
    expect(policy).toContain("SBV-Stellungnahmefrist läuft innerhalb der nächsten 24 Stunden ab");
  });

  it("treats unclear protection status as critical and checks Integrationsamt", () => {
    const policy = readFileSync("services/terminationWorkflowPolicy.ts", "utf8");

    expect(policy).toContain("Schutzstatus ist nicht geklärt");
    expect(policy).toContain("hasPotentialSpecialDismissalProtection");
    expect(policy).toContain("Zustimmung des Integrationsamts ist nicht dokumentiert");
  });

  it("shows a due-date suggestion in the termination detail form", () => {
    const detail = readFileSync("src/app/features/termination/TerminationProcessDetail.tsx", "utf8");

    expect(detail).toContain("suggestedStatementDueAt");
    expect(detail).toContain("Frist vorschlagen");
    expect(detail).toContain("termination-guidance-actions");
    expect(detail).toContain("Fristvorschläge sind Arbeitshilfen");
  });
});
