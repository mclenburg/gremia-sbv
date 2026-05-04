import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.4 security hardening", () => {
  it("zeroes Buffer-based key material and active database keys", () => {
    const security = readFileSync("services/securityService.ts", "utf8");

    expect(security).toContain("function safeDestroyBuffer");
    expect(security).toContain("buffer.fill(0)");
    expect(security).toContain("private destroyActiveDatabaseKey");
    expect(security).toContain("safeDestroyBuffer(this.databaseKey)");
    expect(security).toContain("safeDestroyBuffer(kek)");
  });

  it("uses hardened scrypt parameters for new stores while keeping legacy params", () => {
    const security = readFileSync("services/securityService.ts", "utf8");

    expect(security).toContain("LEGACY_SCRYPT_PARAMS");
    expect(security).toContain("CURRENT_SCRYPT_PARAMS");
    expect(security).toContain("N: 131072");
    expect(security).toContain("version: 4");
    expect(security).toContain("kdfParams: CURRENT_SCRYPT_PARAMS");
  });
});
