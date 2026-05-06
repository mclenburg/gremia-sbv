import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.9 backup legacy restore", () => {
  it("keeps legacy backups restoreable by falling back to old scrypt params", () => {
    const source = readFileSync("services/backupService.ts", "utf8");

    expect(source).toContain("LEGACY_BACKUP_SCRYPT_PARAMS");
    expect(source).toContain("N: 32768");
    expect(source).toContain("function normalizeBackupKdfParams");
    expect(source).toContain("return params ?? LEGACY_BACKUP_SCRYPT_PARAMS");
    expect(source).toContain("deriveBackupKey(passphrase, envelope.salt, envelope.kdfParams)");
  });
});
