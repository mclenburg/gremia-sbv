import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.7.0 Kündigungsanhörung templates", () => {
  it("ships termination system templates", () => {
    const service = readFileSync("services/templateService.ts", "utf8");

    expect(service).toContain("kuendigung-unterlagen-unvollstaendig");
    expect(service).toContain("kuendigung-integrationsamt-hinweis");
    expect(service).toContain("kuendigung-sbv-stellungnahme");
    expect(service).toContain("massnahme:termination_hearing");
  });

  it("adds termination placeholders to process template rendering", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("'kuendigung.status'");
    expect(workflow).toContain("'kuendigung.sbv_frist'");
    expect(workflow).toContain("'kuendigung.integrationsamt_stand'");
    expect(workflow).toContain("'kuendigung.stellungnahme'");
  });
});
