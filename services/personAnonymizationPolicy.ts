import { createHash } from 'node:crypto';

export interface StructuredPersonAnonymizationDecision {
  pseudonymLabel: string;
  firstName: string;
  lastName: string;
  personnelNumber: null;
  workEmail: null;
  organizationalUnit: null;
  location: null;
  notes: null;
  lifecycleState: 'anonymized';
}

export interface PersonDeletionDecision {
  caseBindingState: 'person_deleted';
  privacyReviewReason: 'linked_person_deleted';
  reviewRequired: true;
}

export function assertPersonPrivacyReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized) throw new Error('Für die Anonymisierung oder Löschung ist ein Grund erforderlich.');
  return normalized;
}

export function buildAnonymizedPersonLabel(personId: string): string {
  const suffix = createHash('sha256').update(personId).digest('hex').slice(0, 12);
  return `Anonymisierte Person #${suffix}`;
}

export function decideStructuredPersonAnonymization(personId: string): StructuredPersonAnonymizationDecision {
  return {
    pseudonymLabel: buildAnonymizedPersonLabel(personId),
    firstName: '',
    lastName: '',
    personnelNumber: null,
    workEmail: null,
    organizationalUnit: null,
    location: null,
    notes: null,
    lifecycleState: 'anonymized'
  };
}

export function decidePersonDeletion(): PersonDeletionDecision {
  return {
    caseBindingState: 'person_deleted',
    privacyReviewReason: 'linked_person_deleted',
    reviewRequired: true
  };
}
