import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.7 BEM templates", () => {
  it("ships the full BEM system template pack", () => {
    const service = readFileSync("services/templateService.ts", "utf8");

    for (const key of [
      "bem-angebot-datenschutz",
      "bem-einwilligung-beteiligte",
      "bem-gespraechsprotokoll",
      "bem-massnahmenplan",
      "bem-wirksamkeitspruefung",
      "bem-abschlussvermerk"
    ]) {
      expect(service).toContain(`key: '${key}'`);
    }
  });

  it("binds BEM templates to BEM process statuses", () => {
    const service = readFileSync("services/templateService.ts", "utf8");

    expect(service).toContain("massnahme:bem");
    expect(service).toContain("status:angebot_vorzubereiten");
    expect(service).toContain("status:angenommen");
    expect(service).toContain("status:gespraech_geplant");
    expect(service).toContain("status:massnahmen_vereinbart");
    expect(service).toContain("status:wirksamkeit_pruefen");
    expect(service).toContain("status:abgeschlossen");
  });

  it("adds BEM placeholders for consent, retention, owners and completion", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("'bem.datenschutz_hinweis'");
    expect(workflow).toContain("'bem.einwilligungsumfang'");
    expect(workflow).toContain("'bem.aufbewahrung'");
    expect(workflow).toContain("'bem.verantwortliche'");
    expect(workflow).toContain("'bem.abschlussgrund'");
  });
});
