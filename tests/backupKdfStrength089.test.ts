import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.9 backup KDF strength", () => {
  it("uses CURRENT backup scrypt parameters for newly created backups", () => {
    const source = readFileSync("services/backupService.ts", "utf8");

    expect(source).toContain("CURRENT_BACKUP_SCRYPT_PARAMS");
    expect(source).toContain("N: 131072");
    expect(source).toContain("r: 8");
    expect(source).toContain("p: 1");
    expect(source).toContain("kdfParams: CURRENT_BACKUP_SCRYPT_PARAMS");
    expect(source).toContain("deriveBackupKey(passphrase, salt, CURRENT_BACKUP_SCRYPT_PARAMS)");
  });
});
