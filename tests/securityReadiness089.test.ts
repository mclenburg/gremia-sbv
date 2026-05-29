import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("Security readiness", () => {
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
    expect(docs).not.toContain("Legacy-Backups");
    expect(docs).toContain("verschlüsselt");
  });

  it("verankert Renderer-CSP und gehärtete Electron-WebPreferences", () => {
    const main = readFileSync("electron/main.ts", "utf8");
    const reportIpc = readFileSync("electron/ipc/reportIpc.ts", "utf8");
    const electronSecurity = readFileSync("electron/security/electronSecurity.ts", "utf8");

    expect(main).toContain("registerSessionSecurityPolicy()");
    expect(electronSecurity).toContain("Content-Security-Policy");
    expect(electronSecurity).toContain("script-src ${scriptSrc}");
    expect(electronSecurity).toContain("object-src 'none'");
    expect(electronSecurity).toContain("frame-ancestors 'none'");

    for (const source of [main, reportIpc]) {
      expect(source).toContain("contextIsolation: true");
      expect(source).toContain("nodeIntegration: false");
      expect(source).toContain("sandbox: true");
    }
  });

});
