import type { PersonImportColumnMapping, ProtectionStatus } from '../src/domain/models/protected-person.model.js';
import { getMappedValue, normalizeCell, normalizeDateString, normalizeProtectionStatus } from './personImportParsing.js';

export interface PersonImportStatusResolution {
  protectionStatus: ProtectionStatus;
  statusValidFrom?: string;
  evidenceCheckedAt?: string;
  reason: string;
  warnings: string[];
}

function hasMappedDate(rowObject: Record<string, string>, mappingKey: keyof PersonImportColumnMapping, mapping: PersonImportColumnMapping): string | undefined {
  return normalizeDateString(getMappedValue(rowObject, mappingKey, mapping));
}

export function resolvePersonImportStatus(rowObject: Record<string, string>, mapping: PersonImportColumnMapping): PersonImportStatusResolution {
  const severelyDisabledSince = hasMappedDate(rowObject, 'severelyDisabledSince', mapping);
  if (severelyDisabledSince) {
    return {
      protectionStatus: 'severely_disabled',
      statusValidFrom: severelyDisabledSince,
      evidenceCheckedAt: severelyDisabledSince,
      reason: `Schwerbehindert, weil „${mapping.severelyDisabledSince}“ gefüllt ist.`,
      warnings: [],
    };
  }

  const equivalentPresentedAt = hasMappedDate(rowObject, 'equivalentPresentedAt', mapping);
  if (equivalentPresentedAt) {
    return {
      protectionStatus: 'equivalent',
      statusValidFrom: equivalentPresentedAt,
      evidenceCheckedAt: equivalentPresentedAt,
      reason: `Gleichgestellt, weil „${mapping.equivalentPresentedAt}“ gefüllt ist.`,
      warnings: [],
    };
  }

  const statusValue = normalizeCell(getMappedValue(rowObject, 'protectionStatus', mapping));
  if (statusValue) {
    const protectionStatus = normalizeProtectionStatus(statusValue);
    return {
      protectionStatus,
      reason: `Schutzstatus aus Spalte „${mapping.protectionStatus}“ übernommen.`,
      warnings: protectionStatus === 'unclear' ? ['Der Statuswert ist nicht eindeutig und muss fachlich geprüft werden.'] : [],
    };
  }

  const applicationFiledAt = hasMappedDate(rowObject, 'applicationFiledAt', mapping);
  if (applicationFiledAt) {
    return {
      protectionStatus: 'application_pending',
      statusValidFrom: applicationFiledAt,
      reason: `Antrag läuft, weil „${mapping.applicationFiledAt}“ gefüllt ist.`,
      warnings: ['Es liegt kein vorgelegter Schutzstatus vor. Bitte prüfen, ob die Person in der aktiven Schutzstatusliste geführt werden soll.'],
    };
  }

  return {
    protectionStatus: 'unclear',
    reason: 'Keine belastbare Statusquelle erkannt.',
    warnings: ['Keine Statusspalte und keine gefüllte Nachweis-Datumsspalte erkannt.'],
  };
}
