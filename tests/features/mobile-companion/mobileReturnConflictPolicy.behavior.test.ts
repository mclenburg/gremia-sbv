import { describe, expect, it } from 'vitest';
import {
  areMobileReturnConflictsResolved,
  buildMobileReturnConflictResolutions,
} from '../../../src/app/features/case-handover/mobileReturnConflictPolicy';
import type { MobileCompanionReturnInspectResult } from '../../../src/domain/models/mobile-companion.model';

function inspection(): MobileCompanionReturnInspectResult {
  return {
    packageId: 'return-1', sourceInstanceId: 'mobile', targetInstanceId: 'desktop', createdAt: new Date().toISOString(),
    noteCount: 1, inboxCount: 0, deadlineCount: 0, completedDeadlineCount: 2, applyCount: 1,
    conflictCount: 2, rejectedCount: 0, alreadyDoneCount: 0, blockingErrorCount: 0, canImport: true,
    plan: [
      { mobileId: 'safe-note', type: 'create_note', disposition: 'apply', summary: 'Notiz' },
      { mobileId: 'deadline-a', type: 'complete_deadline', disposition: 'conflict', summary: 'Konflikt A' },
      { mobileId: 'deadline-b', type: 'complete_deadline', disposition: 'conflict', summary: 'Konflikt B' },
    ],
  };
}

describe('Mobile Rückgabe – Konfliktentscheidungen', () => {
  it('fordert genau für jeden Konflikt eine explizite Entscheidung', () => {
    const inspected = inspection();
    expect(areMobileReturnConflictsResolved(inspected, { 'deadline-a': 'keep_desktop' })).toBe(false);
    expect(() => buildMobileReturnConflictResolutions(inspected, { 'deadline-a': 'keep_desktop' }))
      .toThrow(/jeden Konflikt/);
  });

  it('übermittelt nur Konfliktentscheidungen und lässt konfliktfreie Änderungen unberührt', () => {
    const inspected = inspection();
    const decisions = { 'deadline-a': 'keep_desktop', 'deadline-b': 'apply_mobile' } as const;
    expect(areMobileReturnConflictsResolved(inspected, decisions)).toBe(true);
    expect(buildMobileReturnConflictResolutions(inspected, decisions)).toEqual([
      { mobileId: 'deadline-a', decision: 'keep_desktop' },
      { mobileId: 'deadline-b', decision: 'apply_mobile' },
    ]);
  });
});
