import type { PersonImportColumnMapping, ProtectionStatus } from '../src/domain/models/protected-person.model.js';
import { getMappedValue, normalizeCell, normalizeDateString, normalizeProtectionStatus } from './personImportParsing.js';

export interface PersonImportStatusResolution {
  protectionStatus: ProtectionStatus;
  statusValidFrom?: string;
  evidenceCheckedAt?: string;
  reason: string;
  warnings: string[];
  validationErrors: string[];
}

function mappedEvidence(rowObject: Record<string, string>, mappingKey: keyof PersonImportColumnMapping, mapping: PersonImportColumnMapping): { present: boolean; date?: string; error?: string } {
  const raw = normalizeCell(getMappedValue(rowObject, mappingKey, mapping));
  if (!raw || /^(?:nein|no|false|falsch|0|nicht vorhanden|n\/a|-)$/i.test(raw)) return { present: false };
  if (/^(?:ja|yes|true|wahr|x|1)$/i.test(raw)) return { present: true };
  const date = normalizeDateString(raw);
  if (date) return { present: true, date };
  return { present: false, error: `Ungültiger Nachweiswert in „${mapping[mappingKey]}“: Bitte Datum oder eindeutigen Ja/Nein-Marker prüfen.` };
}

export function resolvePersonImportStatus(rowObject: Record<string, string>, mapping: PersonImportColumnMapping): PersonImportStatusResolution {
  const severe = mappedEvidence(rowObject, 'severelyDisabledSince', mapping);
  const equivalent = mappedEvidence(rowObject, 'equivalentPresentedAt', mapping);
  const application = mappedEvidence(rowObject, 'applicationFiledAt', mapping);
  const statusValue = normalizeCell(getMappedValue(rowObject, 'protectionStatus', mapping));
  const explicitStatus = statusValue ? normalizeProtectionStatus(statusValue) : undefined;
  const validationErrors = [severe.error, equivalent.error, application.error].filter((error): error is string => Boolean(error));
  const warnings: string[] = [];
  if (severe.present && equivalent.present) validationErrors.push('Widersprüchliche Nachweise: Schwerbehinderung und Gleichstellung sind beide markiert. Bitte fachlich prüfen.');
  const evidenceStatus = severe.present ? 'severely_disabled' : equivalent.present ? 'equivalent' : undefined;
  if (evidenceStatus && explicitStatus && explicitStatus !== 'unclear' && explicitStatus !== evidenceStatus) {
    validationErrors.push('Widersprüchlicher Schutzstatus: Statusspalte und Nachweisspalte stimmen nicht überein. Bitte fachlich prüfen.');
  }
  if (statusValue && explicitStatus === 'unclear') warnings.push('Der Statuswert ist nicht eindeutig und muss fachlich geprüft werden.');
  if (validationErrors.length) {
    return { protectionStatus: 'unclear', reason: 'Schutzstatus wegen widersprüchlicher oder ungültiger Angaben nicht übernommen.', warnings, validationErrors };
  }
  if (severe.present) {
    return {
      protectionStatus: 'severely_disabled',
      statusValidFrom: severe.date,
      evidenceCheckedAt: severe.date,
      reason: `Schwerbehindert laut „${mapping.severelyDisabledSince}“.`,
      warnings,
      validationErrors,
    };
  }

  if (equivalent.present) {
    return {
      protectionStatus: 'equivalent',
      statusValidFrom: equivalent.date,
      evidenceCheckedAt: equivalent.date,
      reason: `Gleichgestellt laut „${mapping.equivalentPresentedAt}“.`,
      warnings,
      validationErrors,
    };
  }

  if (statusValue) {
    return {
      protectionStatus: explicitStatus!,
      reason: `Schutzstatus aus Spalte „${mapping.protectionStatus}“ übernommen.`,
      warnings,
      validationErrors,
    };
  }

  if (application.present) {
    return {
      protectionStatus: 'application_pending',
      statusValidFrom: application.date,
      reason: `Antrag läuft, weil „${mapping.applicationFiledAt}“ gefüllt ist.`,
      warnings: [...warnings, 'Es liegt kein vorgelegter Schutzstatus vor. Bitte prüfen, ob die Person in der aktiven Schutzstatusliste geführt werden soll.'],
      validationErrors,
    };
  }

  return {
    protectionStatus: 'unclear',
    reason: 'Keine belastbare Statusquelle erkannt.',
    warnings: [...warnings, 'Keine eindeutige Statusquelle erkannt.'],
    validationErrors,
  };
}
