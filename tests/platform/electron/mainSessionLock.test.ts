import { describe, expect, it, vi } from 'vitest';
import { startMainSessionLock } from '../../../electron/security/mainSessionLock.js';

describe('Main-Prozess-Sitzungssperre', () => {
  it('ignoriert kurze Leerlaufzeiten und Messfehler, lässt OS-Sperrereignisse aber aktiv', () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, () => void>();
      const lock = vi.fn();
      const afterLock = vi.fn();
      let idleSeconds = 0;
      const monitor = {
        on: (event: string, listener: () => void) => { listeners.set(event, listener); },
        off: vi.fn(),
        getSystemIdleTime: () => {
          if (idleSeconds < 0) throw new Error('Leerlaufmessung nicht verfügbar');
          return idleSeconds;
        },
      };
      const stop = startMainSessionLock({ monitor, isUnlocked: () => true, lock, afterLock });
      vi.advanceTimersByTime(30_000);
      idleSeconds = -1;
      vi.advanceTimersByTime(30_000);
      expect(lock).not.toHaveBeenCalled();
      listeners.get('lock-screen')?.();
      expect(lock).toHaveBeenCalledOnce();
      expect(afterLock).toHaveBeenCalledOnce();
      stop();
      expect(monitor.off).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('sperrt bei OS-Leerlauf, Bildschirmverriegelung und Suspend samt flüchtiger Sitzung', () => {
    vi.useFakeTimers();
    try {
      const listeners = new Map<string, () => void>();
      let idleSeconds = 0;
      let unlocked = true;
      const lock = vi.fn(() => { unlocked = false; });
      const afterLock = vi.fn();
      const stop = startMainSessionLock({
        monitor: { on: (event: string, listener: () => void) => { listeners.set(event, listener); }, off: vi.fn(), getSystemIdleTime: () => idleSeconds },
        isUnlocked: () => unlocked,
        lock,
        afterLock,
      });
      idleSeconds = 601;
      vi.advanceTimersByTime(30_000);
      expect(lock).toHaveBeenCalledWith('auto');
      expect(afterLock).toHaveBeenCalledTimes(1);
      unlocked = true;
      listeners.get('lock-screen')?.();
      expect(lock).toHaveBeenCalledTimes(2);
      unlocked = true;
      listeners.get('suspend')?.();
      expect(lock).toHaveBeenCalledTimes(3);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
