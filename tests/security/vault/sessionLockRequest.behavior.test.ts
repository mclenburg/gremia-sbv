import { describe, expect, it, vi } from "vitest";
import { requestSecurityLock } from "../../../src/app/core/security/requestSecurityLock";

describe("bestätigter Sitzungssperrstatus", () => {
  it("meldet eine Sperre erst nach positiver Bestätigung des Main-Prozesses", async () => {
    const rejectedLock = vi.fn().mockRejectedValue(new Error("IPC getrennt"));
    const refusedLock = vi.fn().mockResolvedValue({ locked: false });
    const confirmedLock = vi.fn().mockResolvedValue({ locked: true });

    await expect(requestSecurityLock(rejectedLock, "manual")).resolves.toBe("unavailable");
    await expect(requestSecurityLock(refusedLock, "manual")).resolves.toBe("unavailable");
    await expect(requestSecurityLock(confirmedLock, "auto")).resolves.toBe("locked");
  });

  it("behandelt eine fehlende Sicherheitsbrücke als nicht bestätigten Sicherheitszustand", async () => {
    await expect(requestSecurityLock(undefined, "auto")).resolves.toBe("unavailable");
  });
});
