import { describe, expect, it } from 'vitest';
import type { ViewId } from '../src/app/core/navigation/modules';
import { INITIAL_SESSION_VIEW, toLockedSessionState } from '../src/app/core/security/sessionLockState';

type ExampleSession = {
  unlocked: boolean;
  authMode: 'login' | 'setup' | 'recovery' | 'loading' | 'unavailable';
  currentView: ViewId;
  caseNodeTarget: { caseId: string; nodeType: 'bem'; nodeId: string } | null;
  selectedDeadline: { id: string; title: string } | null;
  activityJournalPrefill: { title: string } | null;
};

describe('0.9.5-ab Sperren ist ein Session-State-Verhalten, kein Navigation-Reset', () => {
  it('setzt beim manuellen oder automatischen Sperren nur den Tresorstatus um', () => {
    const activeSession: ExampleSession = {
      unlocked: true,
      authMode: 'login',
      currentView: 'cases',
      caseNodeTarget: { caseId: 'case-1', nodeType: 'bem', nodeId: 'bem-1' },
      selectedDeadline: { id: 'deadline-1', title: 'Arbeitgeberantwort nachhalten' },
      activityJournalPrefill: { title: 'BEM-Gespräch dokumentieren' },
    };

    const locked = toLockedSessionState(activeSession);

    expect(locked).toEqual({
      ...activeSession,
      unlocked: false,
      authMode: 'login',
    });
    expect(locked.currentView).toBe('cases');
    expect(locked.caseNodeTarget).toBe(activeSession.caseNodeTarget);
    expect(locked.selectedDeadline).toBe(activeSession.selectedDeadline);
    expect(locked.activityJournalPrefill).toBe(activeSession.activityJournalPrefill);
  });

  it('definiert den echten Neustart weiterhin bewusst auf Dashboard', () => {
    expect(INITIAL_SESSION_VIEW).toBe('dashboard');
  });
});
