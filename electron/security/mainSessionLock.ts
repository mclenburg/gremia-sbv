import { AUTO_LOCK_TIMEOUT_MS } from '../../src/domain/security/sessionPolicy.js';

interface PowerMonitorBoundary {
  on(event: 'lock-screen' | 'suspend', listener: () => void): unknown;
  off(event: 'lock-screen' | 'suspend', listener: () => void): unknown;
  getSystemIdleTime(): number;
}

export interface MainSessionLockOptions {
  monitor: PowerMonitorBoundary;
  isUnlocked: () => boolean;
  lock: (reason: 'auto') => void;
  afterLock: () => void;
}

export function startMainSessionLock(options: MainSessionLockOptions): () => void {
  const lock = (): void => {
    if (!options.isUnlocked()) return;
    options.lock('auto');
    options.afterLock();
  };
  const checkIdle = (): void => {
    try {
      if (options.monitor.getSystemIdleTime() * 1000 >= AUTO_LOCK_TIMEOUT_MS) lock();
    } catch {
      // Ein Plattformfehler bei der Leerlaufmessung darf die OS-Ereignisse nicht abmelden.
    }
  };
  options.monitor.on('lock-screen', lock);
  options.monitor.on('suspend', lock);
  const timer = setInterval(checkIdle, 30_000);
  timer.unref?.();
  return () => {
    clearInterval(timer);
    options.monitor.off('lock-screen', lock);
    options.monitor.off('suspend', lock);
  };
}
