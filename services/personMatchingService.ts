import type { CreateProtectedPersonInput, PersonImportMatchStrategy, ProtectedPersonRecord } from '../src/app/core/models/protected-person.model.js';

export interface PersonMatchLookup {
  findByPersonnelNumber(personnelNumber: string): ProtectedPersonRecord | undefined;
  findByWorkEmail(workEmail: string): ProtectedPersonRecord | undefined;
  findNameConflict(firstName: string, lastName: string): ProtectedPersonRecord | undefined;
}

export interface PersonMatchResult {
  existing?: ProtectedPersonRecord;
  conflict?: ProtectedPersonRecord;
  matchStrategy: PersonImportMatchStrategy;
  conflictReason?: string;
}

export function resolvePersonImportMatch(input: CreateProtectedPersonInput, lookup: PersonMatchLookup): PersonMatchResult {
  const byPersonnel = input.personnelNumber ? lookup.findByPersonnelNumber(input.personnelNumber) : undefined;
  if (byPersonnel) return { existing: byPersonnel, matchStrategy: 'personnel_number' };

  const byMail = input.workEmail ? lookup.findByWorkEmail(input.workEmail) : undefined;
  if (byMail) return { existing: byMail, matchStrategy: 'work_email' };

  const nameConflict = lookup.findNameConflict(input.firstName, input.lastName);
  if (nameConflict) {
    return {
      conflict: nameConflict,
      matchStrategy: 'name_only_conflict',
      conflictReason: 'Name/Vorname ist kein sicherer Schlüssel. Bitte manuell prüfen.'
    };
  }

  return { matchStrategy: 'none' };
}
