import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.0b BEM legacy service compatibility", () => {
  it("documents currentPhase as deprecated compatibility alias", () => {
    const model = readFileSync("src/app/core/models/bem.model.ts", "utf8");

    expect(model).toContain("export type BemLegacyPhase");
    expect(model).toContain("currentPhase?: BemLegacyPhase");
    expect(model).toContain("@deprecated Legacy alias");
  });

  it("maps modern BEM statuses to legacy process phases", () => {
    const service = readFileSync("services/bemService.ts", "utf8");

    expect(service).toContain("function legacyPhaseForStatus");
    expect(service).toContain("if (status === 'zu_pruefen') return 'pruefung'");
    expect(service).toContain("currentPhase: legacyPhaseForStatus(row.status)");
  });
});
