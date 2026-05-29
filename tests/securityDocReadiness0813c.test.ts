import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("security documentation readiness", () => {
  it("does not contain early prototype placeholder wording", () => {
    const security = readFileSync("docs/SECURITY.md", "utf8");

    expect(security).not.toContain("beim ersten lauffähigen Prototyp");
    expect(security).not.toContain("muss geprüft werden");
    expect(security).toContain("Die Plattformintegration wird über Build-/Readiness-Prüfungen");
  });
});
