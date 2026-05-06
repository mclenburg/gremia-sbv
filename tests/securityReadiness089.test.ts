import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.9 security readiness", () => {
  it("does not add password fragments or sensitive passphrase data to persisted models", () => {
    const security = readFileSync("services/securityService.ts", "utf8");
    const backup = readFileSync("services/backupService.ts", "utf8");
    const securityModel = readFileSync("src/app/core/models/security.model.ts", "utf8");

    expect(securityModel).toContain("unlockDelaySeconds?: number");
    expect(securityModel).toContain("unlockAvailableAt?: string");
    expect(security).not.toMatch(/passwordFragment|lastPassword|persist(ed)?FailedUnlock/i);
    expect(backup).not.toMatch(/passphraseFragment|lastPassphrase/i);
  });

  it("documents the offline attack surface of backups", () => {
    const docs = readFileSync("docs/SECURITY.md", "utf8");

    expect(docs).toContain("Backups sind eine primäre Offline-Angriffsfläche");
    expect(docs).toContain("scrypt N=131072, r=8, p=1");
    expect(docs).toContain("Legacy-Backups");
  });
});
