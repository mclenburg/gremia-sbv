import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.4 database diagnostics", () => {
  it("uses targeted vault open diagnostics instead of one generic message", () => {
    const source = readFileSync("services/securityService.ts", "utf8");

    expect(source).toContain("function formatVaultOpenError");
    expect(source).toContain("Schema-Migration ist fehlgeschlagen");
    expect(source).toContain("falsches Passwort");
    expect(source).toContain("falsche Manifest-Datei");
    expect(source).toContain("kopierte Datenbank aus einem anderen Tresor");
    expect(source).toContain("formatVaultOpenError(error)");
  });
});
