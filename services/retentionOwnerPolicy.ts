import type { RetentionCandidate } from '../src/app/core/models/retention.model.js';
import type { RetentionOwnerSnapshot } from '../src/app/core/models/retention-owner.model.js';

function parseRetentionDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildOfficeOwnerRetentionCandidates(owners: readonly RetentionOwnerSnapshot[], now: Date): RetentionCandidate[] {
  return owners.flatMap((owner) => {
    if (!owner.retentionUntil || owner.legalHoldActive) return [];
    const due = parseRetentionDate(owner.retentionUntil);
    if (!due || due.getTime() > now.getTime()) return [];
    return [{
      id: `office-owner-review-${owner.ownerType}-${owner.ownerId}`,
      type: 'office_workflow_review_due' as const,
      riskLevel: 'info' as const,
      title: 'SBV-Amtsvorgang zur Aufbewahrungsprüfung',
      reference: owner.reference ?? owner.ownerId,
      description: 'Die festgelegte Aufbewahrungsfrist ist erreicht. Vor Löschung oder Archivierung fachliche und rechtliche Bindungen prüfen.',
      recommendedAction: 'pruefen' as const,
      dueSince: owner.retentionUntil,
      entityType: owner.ownerType,
      entityId: owner.ownerId,
    }];
  });
}
