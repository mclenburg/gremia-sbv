import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.0c BEM model module fix", () => {
  it("keeps bem.model.ts as a real module with exported BEM types", () => {
    const model = readFileSync("src/app/core/models/bem.model.ts", "utf8");

    expect(model).toContain("export type BemStatus");
    expect(model).toContain("export type BemResponse");
    expect(model).toContain("export type BemLegacyPhase");
    expect(model).toContain("export interface BemProcessRecord");
    expect(model).toContain("export interface CreateBemProcessInput");
    expect(model).toContain("export interface UpdateBemProcessInput");
    expect(model).toContain("currentPhase?: BemLegacyPhase");
  });
});
