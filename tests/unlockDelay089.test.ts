import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("0.8.9 unlock delay", () => {
  it("keeps failed unlock attempt state only in SecurityService memory", () => {
    const source = readFileSync("services/securityService.ts", "utf8");

    expect(source).toContain("private failedUnlockAttempts = 0");
    expect(source).toContain("private unlockBlockedUntilEpochMs = 0");
    expect(source).toContain("recordFailedUnlockAttempt");
    expect(source).not.toContain("failedUnlockAttempts:");
    expect(source).not.toContain("writeStore({ failedUnlockAttempts");
  });

  it("applies a bounded stepped delay without permanent lockout", () => {
    const source = readFileSync("services/securityService.ts", "utf8");

    expect(source).toContain("UNLOCK_DELAY_STEPS");
    expect(source).toContain("attempts: 3, delayMs: 30 * 1000");
    expect(source).toContain("attempts: 5, delayMs: 60 * 1000");
    expect(source).toContain("attempts: 7, delayMs: 5 * 60 * 1000");
    expect(source).toContain("MAX_UNLOCK_DELAY_MS = 5 * 60 * 1000");
    expect(source).not.toMatch(/permanent(er)? Lockout/i);
  });

  it("resets the delay after a successful password unlock", () => {
    const source = readFileSync("services/securityService.ts", "utf8");
    const unlockBlock = source.slice(source.indexOf("async unlock"), source.indexOf("async changePassword"));

    expect(unlockBlock).toContain("this.resetUnlockDelay()");
    expect(unlockBlock).toContain("return { ok: true, initialized: true, unlocked: true }");
  });
});
