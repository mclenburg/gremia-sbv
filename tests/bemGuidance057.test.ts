import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildBemStatusGuidance, suggestNextBemStatus } from "../services/bemGuidancePolicy";
import type { BemProcessRecord } from "../src/app/core/models/bem.model";

function process(patch: Partial<BemProcessRecord> = {}): BemProcessRecord {
  return {
    id: "bem-1",
    caseId: "case-1",
    status: "angebot_vorzubereiten",
    title: "BEM-Verfahren",
    triggerType: "sechs_wochen_au",
    employeeResponse: "offen",
    contactIds: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch
  };
}

describe("0.5.7 BEM guidance", () => {
  it("suggests status progression based on documented BEM fields", () => {
    expect(suggestNextBemStatus(process({ status: "zu_pruefen", triggerDescription: "42 AU-Tage" }))).toBe("angebot_vorzubereiten");
    expect(suggestNextBemStatus(process({ status: "angebot_vorzubereiten", bemOfferedAt: "2026-01-02T00:00:00.000Z" }))).toBe("angebot_versendet");
    expect(suggestNextBemStatus(process({ status: "angenommen", employeeResponse: "angenommen", privacyNoticeAt: "2026-01-02T00:00:00.000Z", consentScope: "SBV und HR" }))).toBe("gespraech_geplant");
    expect(suggestNextBemStatus(process({ status: "wirksamkeit_pruefen", result: "Maßnahme trägt" }))).toBe("abgeschlossen");
  });

  it("builds required-field guidance for Datenschutz and measures", () => {
    const accepted = buildBemStatusGuidance(process({ status: "angenommen", employeeResponse: "angenommen" }));
    expect(accepted.required.map((item) => item.text).join("\n")).toContain("Datenschutzhinweis");
    expect(accepted.required.map((item) => item.text).join("\n")).toContain("Einwilligungsumfang");

    const measures = buildBemStatusGuidance(process({ status: "massnahmen_vereinbart", employeeResponse: "angenommen" }));
    expect(measures.required.map((item) => item.text).join("\n")).toContain("Maßnahmenplan");
    expect(measures.required.map((item) => item.text).join("\n")).toContain("Verantwortliche");
    expect(measures.required.map((item) => item.text).join("\n")).toContain("Wirksamkeitsprüfung");
  });

  it("renders the guidance panel in the BEM detail view", () => {
    const source = readFileSync("src/app/features/bem/BemProcessDetail.tsx", "utf8");

    expect(source).toContain("buildBemStatusGuidance");
    expect(source).toContain("bem-guidance-panel");
    expect(source).toContain("Status vorschlagen");
    expect(source).toContain("guidance.required.map");
  });
});
