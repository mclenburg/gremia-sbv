export type SecurityLockReason = "manual" | "auto";
export type SecurityLockResult = "locked" | "unavailable";

export type SecurityLockRequest = (
  reason?: SecurityLockReason,
) => Promise<{ locked: boolean }>;

export async function requestSecurityLock(
  lock: SecurityLockRequest | undefined,
  reason: SecurityLockReason,
): Promise<SecurityLockResult> {
  if (!lock) return "unavailable";

  try {
    const result = await lock(reason);
    return result.locked === true ? "locked" : "unavailable";
  } catch {
    return "unavailable";
  }
}
