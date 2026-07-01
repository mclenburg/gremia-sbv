import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('0.9.5-z Sperren bewahrt Arbeitsposition', () => {
  it('setzt beim manuellen oder automatischen Sperren nicht auf das Dashboard zurück', () => {
    const app = readFileSync('src/app/App.tsx', 'utf8');
    const start = app.indexOf('const switchToLockedSession = useCallback(() => {');
    const end = app.indexOf('useAutoLock({', start);
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);

    const lockBlock = app.slice(start, end);
    expect(lockBlock).toContain('setUnlocked(false);');
    expect(lockBlock).toContain('setAuthMode("login");');
    expect(lockBlock).not.toContain('setCurrentView("dashboard")');
    expect(lockBlock).not.toContain('setCaseNodeTarget(null)');
    expect(lockBlock).not.toContain('setSelectedDeadline(null)');
  });

  it('startet weiterhin mit Dashboard als initialer Ansicht nach einem echten Neustart', () => {
    const app = readFileSync('src/app/App.tsx', 'utf8');
    expect(app).toContain('const [currentView, setCurrentView] = useState<ViewId>("dashboard")');
  });
});
