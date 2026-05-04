import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";

describe("0.6.2 equalization notes privacy debt", () => {
  it("documents that equalization notes need encryption hardening before 1.0", () => {
    expect(existsSync("docs/EQUALIZATION_NOTES_ENCRYPTION_DEBT_0_6_2.md")).toBe(true);
    const doc = readFileSync("docs/EQUALIZATION_NOTES_ENCRYPTION_DEBT_0_6_2.md", "utf8");

    expect(doc).toContain("equalization_processes.notes");
    expect(doc).toContain("Art. 9 DSGVO");
    expect(doc).toContain("technischer Schuldposten vor 1.0");
    expect(doc).toContain("feldbezogene Verschlüsselung");
  });
});
