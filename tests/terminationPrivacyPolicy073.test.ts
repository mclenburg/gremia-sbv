import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.3 termination privacy policy", () => {
  it("classifies sensitive termination fields", () => {
    const policy = readFileSync("services/terminationPrivacyPolicy.ts", "utf8");

    expect(policy).toContain("TERMINATION_PRIVACY_FIELD_CLASSIFICATIONS");
    expect(policy).toContain("protectionStatus");
    expect(policy).toContain("employerReason");
    expect(policy).toContain("sbvAssessment");
    expect(policy).toContain("statement");
    expect(policy).toContain("integrationOfficeDecision");
  });

  it("builds an export context with all critical free-text fields", () => {
    const policy = readFileSync("services/terminationPrivacyPolicy.ts", "utf8");

    expect(policy).toContain("buildTerminationExportContext");
    expect(policy).toContain("Arbeitgebervortrag");
    expect(policy).toContain("Fehlende Unterlagen");
    expect(policy).toContain("SBV-Bewertung");
    expect(policy).toContain("SBV-Stellungnahme");
  });
});
