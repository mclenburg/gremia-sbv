import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.6.3 equalization notes plaintext guard", () => {
  it("keeps equalization template placeholders away from plaintext notes", () => {
    const workflow = readFileSync("src/app/workflowViews.tsx", "utf8");

    expect(workflow).toContain("'gleichstellung.notizen': 'Siehe verschlüsselte Fallnotizen in der Fallakte.'");
    expect(workflow).not.toContain("'gleichstellung.notizen': process.notes");
  });

  it("documents that the old notes field is deprecated and only used as legacy marker", () => {
    const model = readFileSync("src/app/core/models/equalization.model.ts", "utf8");

    expect(model).toContain("@deprecated");
    expect(model).toContain("legacyPlaintextNotesPresent");
  });
});
