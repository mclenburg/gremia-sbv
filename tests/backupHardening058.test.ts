import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.5.8 backup hardening", () => {
  it("uses the current app version and adds privacy warnings to backups", () => {
    const source = readFileSync("services/backupService.ts", "utf8");

    expect(source).toContain("import { APP_VERSION } from './generated/appMetadata.js'");
    expect(source).toContain("function buildBackupPrivacyWarnings");
    expect(source).toContain("SBV-, BEM- und Gesundheitsdaten");
    expect(source).toContain("Passphrase getrennt");
  });

  it("warns when backup schema differs from the expected schema", () => {
    const source = readFileSync("services/backupService.ts", "utf8");

    expect(source).toContain("function schemaVersionWarning");
    expect(source).toContain("APP_SCHEMA_VERSION");
    expect(source).toContain("schemaVersionWarning(payload.schemaVersion)");
  });
});
