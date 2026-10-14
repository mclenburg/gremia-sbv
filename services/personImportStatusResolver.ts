import type { PersonImportColumnMapping, ProtectionStatus } from '../src/domain/models/protected-person.model.js';
import { getMappedValue, normalizeCell, normalizeDateString, normalizeProtectionStatus } from './personImportParsing.js';

export interface PersonImportStatusResolution {
  protectionStatus: ProtectionStatus;
  statusValidFrom?: string;
  evidenceCheckedAt?: string;
  reason: string;
  warnings: string[];
}

function mappedEvidence(rowObject: Record<string, string>, mappingKey: keyof PersonImportColumnMapping, mapping: PersonImportColumnMapping): { present: boolean; date?: string; warning?: string } {
  const raw = normalizeCell(getMappedValue(rowObject, mappingKey, mapping));
  if (!raw || /^(?:nein|no|false|falsch|0|nicht vorhanden|n\/a|-)$/i.test(raw)) return { present: false };
  if (/^(?:ja|yes|true|wahr|x|1)$/i.test(raw)) return { present: true };
  const date = normalizeDateString(raw);
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return { present: true, date };
  return { present: false, warning: `Der Wert in „${mapping[mappingKey]}“ ist weder ein eindeutiger Marker noch ein Datum und muss geprüft werden.` };
}

export function resolvePersonImportStatus(rowObject: Record<string, string>, mapping: PersonImportColumnMapping): PersonImportStatusResolution {
  const severe = mappedEvidence(rowObject, 'severelyDisabledSince', mapping);
  const equivalent = mappedEvidence(rowObject, 'equivalentPresentedAt', mapping);
  const warnings = [severe.warning, equivalent.warning].filter((warning): warning is string => Boolean(warning));
  if (severe.present) {
    return {
      protectionStatus: 'severely_disabled',
      statusValidFrom: severe.date,
      evidenceCheckedAt: severe.date,
      reason: `Schwerbehindert laut „${mapping.severelyDisabledSince}“.`,
      warnings,
    };
  }

  if (equivalent.present) {
    return {
      protectionStatus: 'equivalent',
      statusValidFrom: equivalent.date,
      evidenceCheckedAt: equivalent.date,
      reason: `Gleichgestellt laut „${mapping.equivalentPresentedAt}“.`,
      warnings,
    };
  }

  const statusValue = normalizeCell(getMappedValue(rowObject, 'protectionStatus', mapping));
  if (statusValue) {
    const protectionStatus = normalizeProtectionStatus(statusValue);
    return {
      protectionStatus,
      reason: `Schutzstatus aus Spalte „${mapping.protectionStatus}“ übernommen.`,
      warnings: protectionStatus === 'unclear' ? [...warnings, 'Der Statuswert ist nicht eindeutig und muss fachlich geprüft werden.'] : warnings,
    };
  }

  const application = mappedEvidence(rowObject, 'applicationFiledAt', mapping);
  if (application.present) {
    return {
      protectionStatus: 'application_pending',
      statusValidFrom: application.date,
      reason: `Antrag läuft, weil „${mapping.applicationFiledAt}“ gefüllt ist.`,
      warnings: [...warnings, 'Es liegt kein vorgelegter Schutzstatus vor. Bitte prüfen, ob die Person in der aktiven Schutzstatusliste geführt werden soll.'],
    };
  }

  return {
    protectionStatus: 'unclear',
    reason: 'Keine belastbare Statusquelle erkannt.',
    warnings: [...warnings, application.warning, 'Keine eindeutige Statusquelle erkannt.'].filter((warning): warning is string => Boolean(warning)),
  };
}
