import { useEffect } from "react";
import { waitForBridge } from "../bridge/waitForBridge";

export const AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000;
export const AUTO_LOCK_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "focus",
] as const;

export interface UseAutoLockOptions {
  enabled: boolean;
  timeoutMs?: number;
  onLock: () => void;
}

export function useAutoLock({
  enabled,
  timeoutMs = AUTO_LOCK_TIMEOUT_MS,
  onLock,
}: UseAutoLockOptions): void {
  useEffect(() => {
    if (!enabled) return undefined;

    let timer: number | undefined;
    let disposed = false;

    async function lock(reason: "auto" | "manual" = "auto") {
      if (disposed) return;
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      try {
        const bridge = await waitForBridge();
        await bridge?.security?.lock?.(reason);
      } catch {
        // UI muss unabhängig von IPC-Fehlern in den gesperrten Zustand wechseln.
      } finally {
        onLock();
      }
    }

    function schedule() {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = window.setTimeout(() => void lock("auto"), timeoutMs);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        schedule();
      }
    }

    function handlePageHide() {
      void lock("auto");
    }

    for (const eventName of AUTO_LOCK_EVENTS) {
      window.addEventListener(eventName, schedule, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    schedule();

    return () => {
      disposed = true;
      if (timer !== undefined) window.clearTimeout(timer);
      for (const eventName of AUTO_LOCK_EVENTS) {
        window.removeEventListener(eventName, schedule);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [enabled, onLock, timeoutMs]);
}
