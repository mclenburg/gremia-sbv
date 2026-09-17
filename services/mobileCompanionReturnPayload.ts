import { type TargetBoundTransferEnvelope } from './targetBoundTransferCrypto.js';
import type {
  MobileCompanionReturnChange,
  MobileCompanionReturnCreateDeadlineChange,
  MobileCompanionReturnCreateInboxChange,
  MobileCompanionReturnPayload,
} from '../src/domain/models/mobile-companion.model.js';

export const MOBILE_COMPANION_RETURN_FORMAT = 'gremia-sbv-mobile-return';
export const MOBILE_COMPANION_RETURN_VERSION = 1;

export function assertTargetBoundReturnEnvelope(value: unknown): TargetBoundTransferEnvelope {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Mobile-Rückgabepaket ist kein gültiger Übergabe-Envelope.');
  }
  return value as TargetBoundTransferEnvelope;
}

export function assertMobileCompanionReturnPayload(payloadText: string): MobileCompanionReturnPayload {
  const parsed = JSON.parse(payloadText) as Record<string, unknown>;
  if (parsed.protocolVersion !== '1.0' || parsed.schemaVersion !== MOBILE_COMPANION_RETURN_VERSION) {
    throw new Error('Mobile-Rückgabepaket nutzt kein unterstütztes Format.');
  }
  const changes = Array.isArray(parsed.changes) ? parsed.changes.map(assertReturnChange) : [];
  if (!changes.length) throw new Error('Mobile-Rückgabepaket enthält keine Änderungen.');
  if (changes.length > 1000) throw new Error('Mobile-Rückgabepaket enthält zu viele Änderungen.');
  return {
    protocolVersion: '1.0',
    schemaVersion: MOBILE_COMPANION_RETURN_VERSION,
    packageId: assertText(parsed.packageId, 'Paketkennung', 160),
    sourceInstanceId: assertText(parsed.sourceInstanceId, 'Quellinstanz', 80),
    targetInstanceId: assertText(parsed.targetInstanceId, 'Zielinstanz', 80),
    sourceSnapshotPackageId: assertOptionalText(parsed.sourceSnapshotPackageId, 'Ausgangs-Snapshot', 160),
    createdAt: assertIsoDate(parsed.createdAt, 'Erstellungszeitpunkt'),
    changes,
  };
}

export function safeMobileReturnSummary(value: string, maxLength = 120): string {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength - 1)}…`;
}

export function uniqueMobileReturnValues(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function assertReturnChange(value: unknown): MobileCompanionReturnChange {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Mobile-Rückgabepaket enthält eine ungültige Änderung.');
  }
  const record = value as Record<string, unknown>;
  const type = record.type;
  if (type === 'create_note') {
    return {
      type,
      mobileId: assertText(record.mobileId, 'Mobile Änderungs-ID', 120),
      caseId: assertText(record.caseId, 'Fallbezug', 120),
      changedAt: assertIsoDate(record.changedAt, 'Änderungszeitpunkt'),
      title: assertText(record.title, 'Notiztitel', 180),
      content: assertText(record.content, 'Notizinhalt', 20_000),
      participants: assertOptionalText(record.participants, 'Teilnehmende', 1000),
      nextSteps: assertOptionalText(record.nextSteps, 'Nächste Schritte', 5000),
      containsHealthData: record.containsHealthData !== false,
    };
  }
  if (type === 'create_deadline') {
    return {
      type,
      mobileId: assertText(record.mobileId, 'Mobile Änderungs-ID', 120),
      caseId: assertText(record.caseId, 'Fallbezug', 120),
      changedAt: assertIsoDate(record.changedAt, 'Änderungszeitpunkt'),
      title: assertText(record.title, 'Fristentitel', 180),
      dueAt: assertIsoDate(record.dueAt, 'Fälligkeit'),
      reminderAt: assertOptionalIsoDate(record.reminderAt, 'Erinnerung'),
      description: assertOptionalText(record.description, 'Fristbeschreibung', 5000),
      severity: assertSeverity(record.severity),
    };
  }
  if (type === 'create_inbox') {
    return {
      type,
      mobileId: assertText(record.mobileId, 'Mobile Änderungs-ID', 120),
      changedAt: assertIsoDate(record.changedAt, 'Änderungszeitpunkt'),
      title: assertText(record.title, 'Inbox-Titel', 180),
      content: assertText(record.content, 'Inbox-Inhalt', 20_000),
      nextSteps: assertOptionalText(record.nextSteps, 'Nächste Schritte', 5000),
      containsHealthData: normalizeContainsHealthData(record.containsHealthData),
    };
  }
  if (type === 'complete_deadline') {
    return {
      type,
      mobileId: assertText(record.mobileId, 'Mobile Änderungs-ID', 120),
      deadlineId: assertText(record.deadlineId, 'Fristbezug', 120),
      changedAt: assertIsoDate(record.changedAt, 'Änderungszeitpunkt'),
      baseUpdatedAt: assertIsoDate(record.baseUpdatedAt, 'Frist-Basisstand'),
      completedNote: assertOptionalText(record.completedNote, 'Erledigungsvermerk', 5000),
    };
  }
  throw new Error('Mobile-Rückgabepaket enthält eine nicht unterstützte Änderungsart.');
}

function normalizeContainsHealthData(value: unknown): MobileCompanionReturnCreateInboxChange['containsHealthData'] {
  return value !== false;
}

function assertText(value: unknown, label: string, maxLength = 5000): string {
  if (typeof value !== 'string') throw new Error(`${label} fehlt im Mobile-Rückgabepaket.`);
  const trimmed = value.trim();
  if (!trimmed) throw new Error(`${label} fehlt im Mobile-Rückgabepaket.`);
  if (trimmed.length > maxLength) throw new Error(`${label} ist für die mobile Rückgabe zu lang.`);
  return trimmed;
}

function assertOptionalText(value: unknown, label: string, maxLength = 5000): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return assertText(value, label, maxLength);
}

function assertIsoDate(value: unknown, label: string): string {
  const text = assertText(value, label, 80);
  if (Number.isNaN(new Date(text).getTime())) throw new Error(`${label} enthält kein gültiges Datum.`);
  return new Date(text).toISOString();
}

function assertOptionalIsoDate(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  return assertIsoDate(value, label);
}

function assertSeverity(value: unknown): MobileCompanionReturnCreateDeadlineChange['severity'] {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === 'normal' || value === 'important' || value === 'critical' || value === 'fatal') return value;
  throw new Error('Mobile-Rückgabepaket enthält eine ungültige Frist-Priorität.');
}
