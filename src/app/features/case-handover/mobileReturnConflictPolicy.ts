import type {
  MobileCompanionReturnConflictDecision,
  MobileCompanionReturnConflictResolution,
  MobileCompanionReturnInspectResult,
} from '../../../domain/models/mobile-companion.model';

export type MobileReturnConflictDecisions = Record<string, MobileCompanionReturnConflictDecision>;

export function areMobileReturnConflictsResolved(
  inspection: MobileCompanionReturnInspectResult,
  decisions: MobileReturnConflictDecisions,
): boolean {
  return inspection.plan
    .filter((item) => item.disposition === 'conflict')
    .every((item) => Boolean(decisions[item.mobileId]));
}

export function buildMobileReturnConflictResolutions(
  inspection: MobileCompanionReturnInspectResult,
  decisions: MobileReturnConflictDecisions,
): MobileCompanionReturnConflictResolution[] {
  if (!areMobileReturnConflictsResolved(inspection, decisions)) {
    throw new Error('Bitte für jeden Konflikt eine Entscheidung treffen.');
  }
  return inspection.plan.flatMap((item) => {
    if (item.disposition !== 'conflict') return [];
    return [{ mobileId: item.mobileId, decision: decisions[item.mobileId] }];
  });
}
