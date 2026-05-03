import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.0 equalization templates", () => {
  it("ships system templates for equalization and objection handling", () => {
    const service = readFileSync("services/templateService.ts", "utf8");

    expect(service).toContain("gleichstellung-antrag-unterstuetzung");
    expect(service).toContain("gleichstellung-unterlagen-nachfordern");
    expect(service).toContain("gleichstellung-widerspruch-frist");
    expect(service).toContain("massnahme:equalization");
  });

  it("adds equalization placeholders to contextual rendering", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("gleichstellung.aktenzeichen");
    expect(workflow).toContain("gleichstellung.bescheid_am");
    expect(workflow).toContain("gleichstellung.widerspruchsfrist");
    expect(workflow).toContain("gleichstellung.notizen");
  });
});
